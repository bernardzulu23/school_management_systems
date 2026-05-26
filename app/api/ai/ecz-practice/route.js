export const dynamic = 'force-dynamic'
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

const ECZ_PRACTICE_SYSTEM =
  'You are an ECZ examination specialist for Zambian schools. Create valid practice papers with Zambian context. Match the requested exam level exactly.'
import { isValidEczExamLevel, normalizeEczExamLevel } from '@/lib/ecz/ecz-practice-levels'

export async function POST(request) {
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

  const limitBlock = await checkAILimit(schoolId)
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
  const prompt = buildEczPracticePrompt({
    subject,
    examLevel,
    topic,
    questionCount: count,
  })

  try {
    const { object: parsed, usage } = await generateAIObject(
      ECZPracticePaperSchema,
      ECZ_PRACTICE_SYSTEM,
      prompt,
      { maxTokens: 2500, temperature: 0.4 }
    )

    const paper = parsed?.paper
    if (!paper || !Array.isArray(paper.questions)) {
      return NextResponse.json({ error: 'AI returned invalid ECZ JSON' }, { status: 502 })
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

    return NextResponse.json({ success: true, paper })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate practice paper' },
      { status: 500 }
    )
  }
}
