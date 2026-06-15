import { withAILimits } from '@/lib/middleware/withAILimits'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import {
  checkAILimit,
  getPerMinuteLimit,
  getSchoolPlanForUsage,
  trackAIUsage,
} from '@/lib/middleware/aiUsageTracker'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/utils/logger'
import { assertGroqConfigured } from '@/lib/ai/groq-client'
import { generateAIObject } from '@/lib/ai/client'
import { QuizSchema } from '@/lib/ai/schemas'
import { buildQuizPrompt } from '@/lib/ai/subject-adaptive-prompts'
import { appendRagToSystemPrompt, buildRagContextForQuery } from '@/lib/ai/rag-context'
import {
  resolveAssessmentMode,
  normalizeQuestionsForMode,
  validateBloomDistribution,
  ASSESSMENT_MODES,
} from '@/lib/ecz/assessment-engine'

const QUIZ_SYSTEM =
  'You are a Zambian CBC assessment expert. Return only valid quiz data matching the schema. Use Zambian context where appropriate.'

const QuizMakerInputSchema = z.object({
  grade: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']),
  subject: z.string().min(1).max(100),
  topic: z.string().min(3).max(200),
  questionCount: z.number().int().min(1).max(30).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
})

type QuizMakerInput = z.infer<typeof QuizMakerInputSchema>

function buildPrompt(input: QuizMakerInput, assessmentMode: string): string {
  return buildQuizPrompt({
    subject: input.subject,
    grade: input.grade,
    topic: input.topic,
    numQuestions: input.questionCount,
    difficulty: input.difficulty,
    assessmentMode: assessmentMode as 'primary_mcq' | 'secondary_scenario' | 'sba_rubric',
  })
}

export const POST = withAILimits(async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    const user = await getAuthUser(request as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!roleCheck(user, ['TEACHER', 'HOD', 'ADMIN'])) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const schoolId = String(user.schoolId || '').trim()
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const school = await getSchoolPlanForUsage(schoolId)
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

    const perMinuteLimit = getPerMinuteLimit(school.plan)
    const rl = rateLimiter(request as any, {
      limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
      windowMs: 60 * 1000,
      keyPrefix: 'ai_quiz_maker_',
      keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
    })
    if (rl.isLimited) return rl.response as any

    const blocked = await requireFeature(schoolId, 'ai-quiz-maker')
    if (blocked) return blocked as any

    const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
    if (limitBlock) return limitBlock as any

    try {
      assertGroqConfigured()
    } catch {
      logger.error('ai.quiz-maker.misconfigured', new Error('Missing GROQ_API_KEY'), {
        requestId,
        schoolId,
      })
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
    }

    const raw = await request.json().catch(() => null)
    const input = QuizMakerInputSchema.parse(raw)

    logger.info('ai.quiz-maker.started', {
      requestId,
      schoolId,
      userId: user.id,
      grade: input.grade,
      subject: input.subject,
    })

    const assessmentMode = resolveAssessmentMode({
      schoolLevel: school.level,
      gradeLevel: input.grade,
    })

    let prompt = buildPrompt(input, assessmentMode)
    const rag = await buildRagContextForQuery({
      query: `${input.subject} ${input.grade} ${input.topic} quiz assessment`,
      schoolId,
      schoolPlan: school.plan,
      subject: input.subject,
    })
    if (rag.block) {
      prompt = `${prompt}\n\n---\nSchool reference materials:\n${rag.block}`
    }
    const startTime = Date.now()

    const { object: quiz, usage } = await generateAIObject(
      QuizSchema,
      rag.block ? appendRagToSystemPrompt(QUIZ_SYSTEM, rag.block) : QUIZ_SYSTEM,
      prompt,
      {
        maxTokens: 2500,
        temperature: 0.5,
      }
    )

    if (!quiz?.questions?.length) {
      logger.warn('ai.quiz-maker.invalid-json', { requestId, schoolId, userId: user.id })
      return NextResponse.json({ error: 'AI returned invalid quiz JSON' }, { status: 502 })
    }

    quiz.questions = normalizeQuestionsForMode(quiz.questions, assessmentMode)
    const bloomCheck =
      assessmentMode === ASSESSMENT_MODES.SECONDARY_SCENARIO
        ? validateBloomDistribution(
            quiz.questions.map((q: { bloomsLevel?: string; marks?: number }) => ({
              bloomsLevel: q.bloomsLevel,
              marks: q.marks,
            }))
          )
        : { warnings: [], distribution: {} }

    await trackAIUsage(schoolId, 'ai-quiz-maker')
    await prisma.aIRequest.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        feature: 'ai-quiz-maker',
        prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
        response:
          JSON.stringify(quiz).length > 20000
            ? JSON.stringify(quiz).slice(0, 20000)
            : JSON.stringify(quiz),
        tokens: usage.outputTokens,
      },
    })

    logger.info('ai.quiz-maker.completed', {
      requestId,
      schoolId,
      userId: user.id,
      durationMs: Date.now() - startTime,
    })

    return NextResponse.json({
      success: true,
      quiz,
      assessmentMode,
      bloomWarnings: bloomCheck.warnings,
      ragReferences: rag.refs?.length ? rag.refs : undefined,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    logger.error('ai.quiz-maker.error', error, { requestId })
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
})
