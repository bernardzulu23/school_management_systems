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
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import {
  resolveAssessmentMode,
  normalizeQuestionsForMode,
  ASSESSMENT_MODES,
} from '@/lib/ecz/assessment-engine'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import {
  assertStudentSubjectAllowed,
  resolveStudentGradeLabel,
} from '@/lib/flashcards/studentSubjects'
import { assertCurriculumTopicAllowed } from '@/lib/ai/curriculum-context'
import { runValidationSideBySide } from '@/lib/ecz/eoc/runValidationSideBySide'

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

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

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

  const blocked = await requireFeature(schoolId, 'ai-tools')
  if (blocked) return blocked

  const blockedFeature = await requireFeature(schoolId, 'ecz-practice')
  if (blockedFeature) return blockedFeature

  const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
  if (limitBlock) return limitBlock

  try {
    assertGroqConfigured()
  } catch {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  let subject = String(body?.subject || '').trim()
  const examLevelRaw = String(body?.examLevel || body?.level || '').trim() || 'form1'
  const examLevel = normalizeEczExamLevel(examLevelRaw)
  let topic = String(body?.topic || '').trim()
  const questionCount = Number(body?.questionCount ?? 5)

  if (!subject || !topic) {
    return NextResponse.json({ error: 'subject and topic required' }, { status: 400 })
  }

  if (!isValidEczExamLevel(examLevel)) {
    return NextResponse.json({ error: 'Invalid exam level' }, { status: 400 })
  }

  const isStudent = roleCheck(user, ['STUDENT', 'student'])
  let gradeLevel = String(body?.gradeLevel || '').trim()
  if (isStudent) {
    const db = getTenantClient(schoolId)
    const student = await db.student.findFirst({
      where: { schoolId, userId: user.id },
      select: {
        id: true,
        class: true,
        classRef: { select: { year_group: true } },
      },
    })
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }
    try {
      subject = await assertStudentSubjectAllowed(student.id, schoolId, subject, {
        action: 'practice',
      })
    } catch (e) {
      return NextResponse.json(
        { error: e?.message || 'Subject not enrolled' },
        { status: e?.status || 403 }
      )
    }
    gradeLevel = resolveStudentGradeLabel(student) || gradeLevel || examLevel
    try {
      topic = await assertCurriculumTopicAllowed(subject, gradeLevel, topic, {
        required: true,
      })
    } catch (e) {
      return NextResponse.json({ error: e?.message || 'Invalid topic' }, { status: 400 })
    }
  } else {
    gradeLevel = gradeLevel || examLevel
    try {
      topic = await assertCurriculumTopicAllowed(subject, gradeLevel, topic, {
        required: true,
      })
    } catch (e) {
      // Teachers may still generate when curriculum is missing (empty topics → free-form).
      // Reject only when topics exist and the request does not match.
      if (String(e?.message || '').includes('not in the curriculum')) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
    }
  }

  const guard = validateAIGuardrails({ text: `${subject} ${examLevel} ${topic}` })
  if (!guard.ok) return guard.response

  const count =
    Number.isFinite(questionCount) && questionCount > 0 ? Math.min(20, questionCount) : 5

  const assessmentMode =
    isSecondaryExamLevel(examLevel) ||
    resolveAssessmentMode({ schoolLevel: school.level }) === ASSESSMENT_MODES.SECONDARY_SCENARIO
      ? ASSESSMENT_MODES.SECONDARY_SCENARIO
      : ASSESSMENT_MODES.PRIMARY_MCQ

  // Never serve AiCache — regenerating practice must produce a new paper.
  const variationSeed = String(body?.variationSeed || '').trim() || crypto.randomUUID()

  let prompt = buildEczPracticePrompt({
    subject,
    examLevel,
    topic,
    questionCount: count,
    assessmentMode,
  })
  prompt = `${prompt}\n\nProduce a fresh unique practice set (variation: ${variationSeed}). Do not reuse prior wording.`

  const rag = await buildRagContextForQuery({
    query: `${subject} ${examLevel} ${topic} ECZ examination practice`,
    schoolId,
    schoolPlan: school.plan,
    subject,
    gradeLevel,
  })
  if (rag.block) {
    prompt = `${prompt}\n\n---\nSchool reference materials (cite textbook refs as [Ref N]):\n${rag.block}`
  }

  try {
    const { object: parsed, usage } = await generateAIObject(
      ECZPracticePaperSchema,
      rag.block ? appendRagToSystemPrompt(ECZ_PRACTICE_SYSTEM, rag.block) : ECZ_PRACTICE_SYSTEM,
      prompt,
      { maxTokens: 3000, temperature: 0.7 }
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

    const responsePayload = {
      success: true,
      paper,
      assessmentMode,
      ragReferences: rag.refs?.length ? rag.refs : undefined,
      variationSeed,
    }

    const sideBySideItems = []
    if (Array.isArray(paper?.scenarios)) {
      for (const scenario of paper.scenarios) {
        sideBySideItems.push({ kind: 'scenario', scenario })
      }
    }
    if (Array.isArray(paper?.questions)) {
      for (const question of paper.questions) {
        sideBySideItems.push({ kind: 'practice_question', question })
      }
    }
    void runValidationSideBySide({
      schoolId,
      source: 'ecz_practice',
      subject,
      topicTag: topic,
      formLevel: gradeLevel || examLevel,
      assessmentMode,
      items: sideBySideItems,
    }).catch(() => {})

    return NextResponse.json(responsePayload)
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate practice paper' },
      { status: 500 }
    )
  }
})
