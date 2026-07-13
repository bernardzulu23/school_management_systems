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
import { generateAIObject, GROQ_STRUCTURED_MODEL } from '@/lib/ai/client'
import { QuizGenerationSchema, parseQuizObject } from '@/lib/ai/schemas'
import { buildQuizPrompt } from '@/lib/ai/subject-adaptive-prompts'
import { appendRagToSystemPrompt, buildRagContextForQuery } from '@/lib/ai/rag-context'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/cache'
import {
  resolveAssessmentMode,
  salvageQuestionsForMode,
  validateBloomDistribution,
  ASSESSMENT_MODES,
} from '@/lib/ecz/assessment-engine'

const QUIZ_SYSTEM =
  'You are a Zambian CBC assessment expert. Return only valid quiz data matching the schema. Use Zambian context where appropriate.'

const QuizMakerInputSchema = z.object({
  grade: z.string().min(1).max(40),
  subject: z.string().min(1).max(100),
  topic: z.string().min(3).max(200),
  questionCount: z.number().int().min(1).max(30).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  materialIds: z.array(z.string().min(1)).max(5).optional(),
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
    } catch (configError) {
      logger.error('ai.quiz-maker.misconfigured', configError, {
        requestId,
        schoolId,
      })
      return NextResponse.json(
        { error: 'AI service is not configured (set GROQ_API_KEY or GEMINI_API_KEY)' },
        { status: 503 }
      )
    }

    const raw = await request.json().catch(() => null)
    const input = QuizMakerInputSchema.parse(raw)
    const guard = validateAIGuardrails({
      text: [input.subject, input.grade, input.topic, input.difficulty].join(' '),
    })
    if (!guard.ok) return guard.response

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
      purpose: 'formative',
    })
    const cachePayload = {
      schoolId,
      grade: input.grade,
      subject: input.subject,
      topic: input.topic,
      questionCount: input.questionCount,
      difficulty: input.difficulty,
      materialIds: input.materialIds || [],
      assessmentMode,
      purpose: 'formative',
    }
    const cached = await getCachedAIResponse<{
      success: boolean
      quiz: unknown
      assessmentMode: string
      bloomWarnings?: string[]
      ragReferences?: unknown[]
      materialIds?: string[]
    }>('ai-quiz-maker', cachePayload)
    if (cached) return NextResponse.json(cached)

    let prompt = buildPrompt(input, assessmentMode)
    const rag = await buildRagContextForQuery({
      query: `${input.subject} ${input.grade} ${input.topic} quiz assessment`,
      schoolId,
      schoolPlan: school.plan,
      subject: input.subject,
      materialIds: input.materialIds,
      gradeLevel: input.grade,
    })
    if (rag.block) {
      prompt = `${prompt}\n\n---\nSchool reference materials:\n${rag.block}`
    }
    const startTime = Date.now()

    const quizSystem = rag.block ? appendRagToSystemPrompt(QUIZ_SYSTEM, rag.block) : QUIZ_SYSTEM
    const quizModels = [
      GROQ_STRUCTURED_MODEL,
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
    ].filter((m, i, a) => a.indexOf(m) === i)

    let rawQuiz: Record<string, unknown> | null = null
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

    try {
      const generated = await generateAIObject(QuizGenerationSchema, quizSystem, prompt, {
        maxTokens: 3500,
        temperature: 0.4,
        models: quizModels,
      })
      rawQuiz = generated.object as Record<string, unknown>
      usage = generated.usage
    } catch (genError) {
      logger.warn('ai.quiz-maker.structured-failed', {
        requestId,
        schoolId,
        message: genError instanceof Error ? genError.message : String(genError),
      })
      const { generateAIText } = await import('@/lib/ai/client')
      const { extractJSONObject } = await import('@/lib/ai/groq-client')
      const textResult = await generateAIText(
        `${prompt}\n\nRespond with ONLY valid JSON for a quiz with title, grade, subject, topic, and questions[]. Each question needs id, type (mcq|short|true_false), question, options (for mcq), answer.`,
        { system: quizSystem, maxTokens: 3500, temperature: 0.4, models: quizModels }
      )
      rawQuiz = extractJSONObject(textResult.text)
      usage = textResult.usage || usage
      if (!rawQuiz) throw genError
    }

    const parsed = parseQuizObject({
      ...rawQuiz,
      grade: (rawQuiz?.grade as string) || input.grade,
      subject: (rawQuiz?.subject as string) || input.subject,
      topic: (rawQuiz?.topic as string) || input.topic,
      title: (rawQuiz?.title as string) || `${input.subject} — ${input.topic}`,
    })
    if (!parsed.success) {
      logger.warn('ai.quiz-maker.schema-mismatch', {
        requestId,
        schoolId,
        issues: parsed.error.issues?.slice(0, 5),
      })
      return NextResponse.json(
        {
          error:
            'AI returned quiz JSON that could not be normalized. Try fewer questions or a simpler topic.',
        },
        { status: 502 }
      )
    }
    const quiz = parsed.data

    if (!quiz?.questions?.length) {
      logger.warn('ai.quiz-maker.invalid-json', { requestId, schoolId, userId: user.id })
      return NextResponse.json({ error: 'AI returned invalid quiz JSON' }, { status: 502 })
    }

    quiz.questions = salvageQuestionsForMode(quiz.questions, assessmentMode)
    if (!quiz.questions?.length) {
      logger.warn('ai.quiz-maker.empty-after-normalize', {
        requestId,
        schoolId,
        assessmentMode,
      })
      return NextResponse.json(
        {
          error:
            'Quiz generation produced no usable questions. Try again with fewer questions or a clearer topic.',
        },
        { status: 502 }
      )
    }

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

    const responsePayload = {
      success: true,
      quiz,
      assessmentMode,
      bloomWarnings: bloomCheck.warnings,
      ragReferences: rag.refs?.length ? rag.refs : undefined,
      materialIds: rag.materialIds?.length ? rag.materialIds : input.materialIds,
    }
    await setCachedAIResponse('ai-quiz-maker', cachePayload, responsePayload)

    return NextResponse.json(responsePayload)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    logger.error('ai.quiz-maker.error', error, { requestId })
    const message = error instanceof Error ? error.message : 'Failed to process request'
    const status = message.toLowerCase().includes('ai generation failed') ? 502 : 500
    return NextResponse.json({ error: message }, { status })
  }
})
