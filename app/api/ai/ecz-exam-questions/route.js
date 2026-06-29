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
import { ECZExamQuestionsResponseSchema } from '@/lib/ai/schemas'
import { buildEczExamPrompt } from '@/lib/ai/subject-adaptive-prompts'
import { appendRagToSystemPrompt, buildRagContextForQuery } from '@/lib/ai/rag-context'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import {
  validateExamItem,
  validateBloomDistribution,
  ASSESSMENT_MODES,
} from '@/lib/ecz/assessment-engine'

const EXAM_SYSTEM =
  'You are an ECZ ECSEOL examination specialist for Zambian secondary schools. Create scenario-based exam items only — never multiple choice. Return valid JSON matching the schema.'

export const POST = withAILimits(async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
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
    keyPrefix: 'ai_ecz_exam_',
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
  const subject = String(body?.subject || '').trim()
  const form = String(body?.form || 'Form 2').trim()
  const topic = String(body?.topic || '').trim()
  const elementOfConstruct = body?.elementOfConstruct
    ? String(body.elementOfConstruct).trim()
    : undefined
  const scenarioCount = Number(body?.scenarioCount ?? 1)

  if (!subject || !topic) {
    return NextResponse.json({ error: 'subject and topic required' }, { status: 400 })
  }

  let prompt = buildEczExamPrompt({
    subject,
    form,
    topic,
    elementOfConstruct,
    scenarioCount,
  })

  const rag = await buildRagContextForQuery({
    query: `${subject} ${form} ${topic} ECSEOL exam scenario`,
    schoolId,
    schoolPlan: school.plan,
    subject,
  })
  if (rag.block) {
    prompt = `${prompt}\n\n---\nSchool reference materials:\n${rag.block}`
  }

  const { object: parsed, usage } = await generateAIObject(
    ECZExamQuestionsResponseSchema,
    rag.block ? appendRagToSystemPrompt(EXAM_SYSTEM, rag.block) : EXAM_SYSTEM,
    prompt,
    { maxTokens: 3500, temperature: 0.35 }
  )

  const scenarios = Array.isArray(parsed?.scenarios) ? parsed.scenarios : []
  if (!scenarios.length) {
    return NextResponse.json({ error: 'AI returned no exam scenarios' }, { status: 502 })
  }

  const validationErrors = []
  const bloomItems = []
  for (const scenario of scenarios) {
    const itemCheck = validateExamItem(
      {
        type: 'scenario',
        question: scenario.zambianScenario,
        zambianScenario: scenario.zambianScenario,
        elementOfConstruct: scenario.elementOfConstruct,
      },
      ASSESSMENT_MODES.SECONDARY_SCENARIO,
      { requireZambianContext: true, requireEoC: true }
    )
    if (!itemCheck.ok) validationErrors.push(...itemCheck.errors)
    for (const sq of scenario.subQuestions || []) {
      bloomItems.push({ bloomsLevel: sq.bloomsLevel, marks: sq.marks })
    }
  }

  const bloomCheck = validateBloomDistribution(bloomItems)

  await trackAIUsage(schoolId, 'ecz-exam-questions')
  await prisma.aIRequest.create({
    data: {
      id: crypto.randomUUID(),
      schoolId,
      feature: 'ecz-exam-questions',
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
    scenarios,
    validation: {
      errors: validationErrors,
      bloomWarnings: bloomCheck.warnings,
      bloomDistribution: bloomCheck.distribution,
    },
    ragReferences: rag.refs?.length ? rag.refs : undefined,
  })
})
