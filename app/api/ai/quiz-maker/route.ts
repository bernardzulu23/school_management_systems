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
import { assertGroqConfigured, extractJSONObject, groqChatCompletion } from '@/lib/ai/groq-client'
import { buildQuizPrompt } from '@/lib/ai/subject-adaptive-prompts'

const QuizMakerInputSchema = z.object({
  grade: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']),
  subject: z.string().min(1).max(100),
  topic: z.string().min(3).max(200),
  questionCount: z.number().int().min(1).max(30).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
})

type QuizMakerInput = z.infer<typeof QuizMakerInputSchema>

function buildPrompt(input: QuizMakerInput): string {
  return buildQuizPrompt({
    subject: input.subject,
    grade: input.grade,
    topic: input.topic,
    numQuestions: input.questionCount,
    difficulty: input.difficulty,
  })
}

export async function POST(request: Request) {
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

    const limitBlock = await checkAILimit(schoolId)
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

    const prompt = buildPrompt(input)
    const startTime = Date.now()

    const { content, usage } = await groqChatCompletion({
      prompt,
      maxTokens: 2500,
      temperature: 0.5,
    })

    const quiz = extractJSONObject(content)
    if (!quiz || !Array.isArray((quiz as { questions?: unknown }).questions)) {
      logger.warn('ai.quiz-maker.invalid-json', { requestId, schoolId, userId: user.id })
      return NextResponse.json({ error: 'AI returned invalid quiz JSON' }, { status: 502 })
    }

    await trackAIUsage(schoolId, 'ai-quiz-maker')
    await prisma.aIRequest.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        feature: 'ai-quiz-maker',
        prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
        response: content.length > 20000 ? content.slice(0, 20000) : content,
        tokens: usage.completionTokens,
      },
    })

    logger.info('ai.quiz-maker.completed', {
      requestId,
      schoolId,
      userId: user.id,
      durationMs: Date.now() - startTime,
    })

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    logger.error('ai.quiz-maker.error', error, { requestId })
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
