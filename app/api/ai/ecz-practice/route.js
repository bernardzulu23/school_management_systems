export const dynamic = 'force-dynamic'
import { withAILimits } from '@/lib/middleware/withAILimits'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import {
  checkAILimit,
  getPerMinuteLimit,
  getSchoolPlanForUsage,
  trackAIUsage,
} from '@/lib/middleware/aiUsageTracker'
import { assertGroqConfigured } from '@/lib/ai/groq-client'
import { generateAIObject } from '@/lib/ai/client'
import { ECZPracticePaperSchema } from '@/lib/ai/schemas'
import { buildEczPracticePrompt } from '@/lib/ai/subject-adaptive-prompts'
import { appendRagToSystemPrompt, buildRagContextForQuery } from '@/lib/ai/rag-context'
import { isValidEczExamLevel, normalizeEczExamLevel } from '@/lib/ecz/ecz-practice-levels'
import {
  resolveAssessmentMode,
  normalizeQuestionsForMode,
  ASSESSMENT_MODES,
} from '@/lib/ecz/assessment-engine'

const ECZ_PRACTICE_SYSTEM =
  'You are an ECZ examination specialist for Zambian schools. Create valid practice papers with Zambian context. Match the requested exam level exactly. Secondary levels: scenario-based only, no MCQ.'

function isSecondaryExamLevel(examLevel) {
  const key = normalizeEczExamLevel(examLevel)
  return /^form[1-6]$/.test(key) || /^grade(8|9|10|11|12)$/.test(key)
}

export const POST = withAILimits(async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (
    !roleCheck(user, [
      'STUDENT',
      'student',
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const perMinuteLimit = getPerMinuteLimit(school.plan)
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai_ecz_practice_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'ecz-practice')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
  if (limitBlock) return limitBlock

  try {
    assertGroqConfigured()
  } catch {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const subject = String(body?.subject || '').trim()
  const examLevelRaw = String(body?.examLevel || body?.level || '').trim() || 'grade9'
  const examLevel = normalizeEczExamLevel(examLevelRaw)
  const topic = String(body?.topic || '').trim()
  const questionCount = Number(body?.questionCount ?? 5)

  if (!subject || !topic) {
    return NextResponse.json({ error: 'subject and topic required' }, { status: 400 })
  }

  if (!isValidEczExamLevel(examLevel)) {
    return NextResponse.json({ error: 'Invalid exam level' }, { status: 400 })
  }

  const count =
    Number.isFinite(questionCount) && questionCount > 0 ? Math.min(20, questionCount) : 5

  const assessmentMode =
    isSecondaryExamLevel(examLevel) ||
    resolveAssessmentMode({ schoolLevel: school.level }) === ASSESSMENT_MODES.SECONDARY_SCENARIO
      ? ASSESSMENT_MODES.SECONDARY_SCENARIO
      : ASSESSMENT_MODES.PRIMARY_MCQ

  let prompt = buildEczPracticePrompt({
    subject,
    examLevel,
    topic,
    questionCount: count,
    assessmentMode,
  })

  const rag = await buildRagContextForQuery({
    query: `${subject} ${examLevel} ${topic} ECZ examination practice`,
    schoolId,
    schoolPlan: school.plan,
    subject,
  })
  if (rag.block) {
    prompt = `${prompt}\n\n---\nSchool reference materials (cite textbook refs as [Ref N]):\n${rag.block}`
  }

  try {
    const { object: parsed, usage } = await generateAIObject(
      ECZPracticePaperSchema,
      rag.block ? appendRagToSystemPrompt(ECZ_PRACTICE_SYSTEM, rag.block) : ECZ_PRACTICE_SYSTEM,
      prompt,
      { maxTokens: 3000, temperature: 0.4 }
    )

    const paper = parsed?.paper
    const hasScenarios = Array.isArray(paper?.scenarios) && paper.scenarios.length > 0
    const hasQuestions = Array.isArray(paper?.questions) && paper.questions.length > 0

    if (!paper || (!hasScenarios && !hasQuestions)) {
      return NextResponse.json({ error: 'AI returned invalid ECZ JSON' }, { status: 502 })
    }

    if (assessmentMode === ASSESSMENT_MODES.SECONDARY_SCENARIO && hasQuestions) {
      paper.questions = normalizeQuestionsForMode(paper.questions, assessmentMode)
    }

    await trackAIUsage(schoolId, 'ecz-practice')
    await prisma.aIRequest.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        feature: 'ecz-practice',
        prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
        response:
          JSON.stringify(parsed).length > 20000
            ? JSON.stringify(parsed).slice(0, 20000)
            : JSON.stringify(parsed),
        tokens: usage.outputTokens,
      },
    })

    return NextResponse.json({
      success: true,
      paper,
      assessmentMode,
      ragReferences: rag.refs?.length ? rag.refs : undefined,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate practice paper' },
      { status: 500 }
    )
  }
})
