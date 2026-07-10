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
import { buildLessonPlanPrompt } from '@/lib/lessonPlanTemplate'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'
import { aiChain, AI_SSE_HEADERS } from '@/lib/ai/provider-fallback'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/cache'

const LESSON_PLAN_SYSTEM =
  'You are an expert Zambian CBC lesson planner. Write complete, practical lesson plans aligned to MoGE guidelines and Zambian classroom context.'

const LessonPlannerInputSchema = z.object({
  grade: z.string().min(1).max(20),
  subject: z.string().min(1).max(100),
  topic: z.string().min(3).max(200),
  subtopic: z.string().max(200).optional(),
  duration: z.number().int().min(1).max(240),
  term: z.string().max(20).optional(),
  learners: z.number().int().min(1).max(200).optional(),
  learningStyle: z.enum(['mixed', 'visual', 'kinesthetic', 'auditory']).default('mixed'),
  priorKnowledge: z.string().max(300).optional(),
  templateType: z
    .enum([
      'standard',
      'science',
      'language',
      'business',
      'practical',
      'humanities',
      'arts',
      'technology',
      'mathematics',
    ])
    .default('standard'),
  /** @deprecated prefer coreCompetencies */
  competenceFocus: z.string().max(300).optional(),
  coreCompetencies: z.array(z.string().max(120)).max(10).optional(),
  crossCuttingThemes: z.array(z.string().max(120)).max(10).optional(),
  learningPathway: z.string().max(80).optional(),
  assessmentMethod: z.string().max(120).optional(),
  realWorldContext: z.string().max(500).optional(),
  zambiContext: z.string().max(500).optional(),
  includePractical: z.boolean().optional(),
  includeInclusive: z.boolean().optional(),
  languageOfInstruction: z.string().max(120).optional(),
  resourceLevel: z.string().max(200).optional(),
  additionalInstructions: z.string().max(800).optional(),
  references: z.string().max(500).optional(),
  teachingAids: z.string().max(500).optional(),
  lessonNumber: z.number().int().min(1).max(200).optional(),
  totalLessonsInUnit: z.number().int().min(1).max(200).optional(),
  numberOfBoys: z.number().int().min(0).max(500).optional(),
  numberOfGirls: z.number().int().min(0).max(500).optional(),
  planDate: z.string().max(30).optional(),
  /** When false, returns JSON `{ lessonPlan, generatedBy }` instead of SSE. Default true for UI streaming. */
  stream: z.boolean().optional().default(true),
})

type LessonPlannerInput = z.infer<typeof LessonPlannerInputSchema>

function buildPrompt(input: LessonPlannerInput, userId: string, schoolId: string): Promise<string> {
  return getLessonPlanTeacherContext(userId, schoolId, input.subject).then((ctx) =>
    buildLessonPlanPrompt({
      templateType: input.templateType,
      subject: input.subject,
      grade: input.grade,
      topic: input.topic,
      subtopic: input.subtopic,
      duration: input.duration,
      learners: input.learners,
      term: input.term,
      competenceFocus: input.competenceFocus,
      coreCompetencies: input.coreCompetencies,
      crossCuttingThemes: input.crossCuttingThemes,
      learningPathway: input.learningPathway,
      assessmentMethod: input.assessmentMethod,
      realWorldContext: input.realWorldContext || input.zambiContext,
      includePractical: input.includePractical,
      includeInclusive: input.includeInclusive,
      languageOfInstruction: input.languageOfInstruction,
      resourceLevel: input.resourceLevel,
      learningStyle: input.learningStyle,
      priorKnowledge: input.priorKnowledge,
      additionalInstructions: input.additionalInstructions,
      references: input.references,
      teachingAids: input.teachingAids,
      lessonNumber: input.lessonNumber,
      totalLessonsInUnit: input.totalLessonsInUnit,
      numberOfBoys: input.numberOfBoys,
      numberOfGirls: input.numberOfGirls,
      planDate: input.planDate,
      teacherName: ctx.teacherName,
      schoolName: ctx.schoolName,
      teacherGender: ctx.teacherGender || undefined,
      departmentName: ctx.department || undefined,
    })
  )
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
      keyPrefix: 'ai_lesson_planner_',
      keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
    })
    if (rl.isLimited) return rl.response as any

    const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
    if (blocked) return blocked as any

    const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
    if (limitBlock) return limitBlock as any

    if (!aiChain.isConfigured()) {
      logger.error('ai.lesson-planner.misconfigured', new Error('No AI provider keys set'), {
        requestId,
        schoolId,
      })
      return NextResponse.json(
        {
          error:
            'AI service is not configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.',
        },
        { status: 503 }
      )
    }

    const raw = await request.json().catch(() => null)
    const input = LessonPlannerInputSchema.parse(raw)
    const guard = validateAIGuardrails({
      text: [
        input.subject,
        input.grade,
        input.topic,
        input.subtopic || '',
        input.additionalInstructions || '',
      ].join(' '),
    })
    if (!guard.ok) return guard.response

    const cachePayload = {
      schoolId,
      userId: String(user.id),
      input,
    }
    const cached = await getCachedAIResponse<{
      success: boolean
      lessonPlan: string
      generatedBy: string
      model?: string
      ragReferences?: unknown[]
    }>('ai-lesson-planner', cachePayload)
    if (cached) {
      if (input.stream === false) return NextResponse.json(cached)
      const stream = aiChain.textToEventStream({
        text: cached.lessonPlan || '',
        provider: cached.generatedBy || 'cache',
        model: cached.model || 'cache',
        meta: cached.ragReferences?.length ? { ragReferences: cached.ragReferences } : undefined,
      })
      return new Response(stream, { headers: AI_SSE_HEADERS })
    }

    logger.info('ai.lesson-planner.started', {
      requestId,
      schoolId,
      userId: user.id,
      grade: input.grade,
      subject: input.subject,
    })

    let prompt = await buildPrompt(input, String(user.id), schoolId)
    const rag = await buildRagContextForQuery({
      query: `${input.subject} ${input.grade} ${input.topic} lesson plan`,
      schoolId,
      schoolPlan: school.plan,
      subject: input.subject,
    })
    if (rag.block) {
      prompt = `${prompt}\n\n---\nSchool reference materials (cite as [Ref N]):\n${rag.block}`
    }

    const systemPrompt = rag.block
      ? `${LESSON_PLAN_SYSTEM}\n\nUse these school reference materials where relevant:\n${rag.block}`
      : LESSON_PLAN_SYSTEM

    const startTime = Date.now()

    // Groq (AI SDK) → Gemini → OpenRouter → OpenAI → HuggingFace
    let aiResponse
    try {
      const { generateAIText } = await import('@/lib/ai/client')
      const sdkResult = await generateAIText(prompt, {
        system: systemPrompt,
        maxTokens: 4500,
        temperature: 0.7,
      })
      aiResponse = {
        text: sdkResult.text,
        provider: sdkResult.provider || 'groq',
        model: sdkResult.model,
      }
    } catch (sdkError) {
      logger.warn('ai.lesson-planner.sdk-fallback', {
        requestId,
        message: sdkError instanceof Error ? sdkError.message : String(sdkError),
      })
      aiResponse = await aiChain.generate(prompt, {
        system: systemPrompt,
        maxTokens: 4500,
        temperature: 0.7,
      })
    }

    await trackAIUsage(schoolId, 'ai-lesson-planner')
    await prisma.aIRequest.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        feature: 'ai-lesson-planner',
        prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
        response:
          aiResponse.text.length > 20000 ? aiResponse.text.slice(0, 20000) : aiResponse.text,
        tokens: 0,
      },
    })

    logger.info('ai.lesson-planner.completed', {
      requestId,
      schoolId,
      userId: user.id,
      durationMs: Date.now() - startTime,
      generatedBy: aiResponse.provider,
      model: aiResponse.model,
    })

    const responsePayload = {
      success: true,
      lessonPlan: aiResponse.text,
      generatedBy: aiResponse.provider,
      model: aiResponse.model,
      ragReferences: rag.refs?.length ? rag.refs : undefined,
    }
    await setCachedAIResponse('ai-lesson-planner', cachePayload, responsePayload)

    if (input.stream === false) {
      return NextResponse.json(responsePayload)
    }

    const stream = aiChain.textToEventStream({
      text: aiResponse.text,
      provider: aiResponse.provider,
      model: aiResponse.model,
      meta: rag.refs?.length ? { ragReferences: rag.refs } : undefined,
    })

    return new Response(stream, { headers: AI_SSE_HEADERS })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }

    logger.error('ai.lesson-planner.error', error, { requestId })
    const message = error instanceof Error ? error.message : 'Failed to process request'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
