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
import {
  assertGroqConfigured,
  createGroqTextEventStream,
  GROQ_SSE_HEADERS,
} from '@/lib/ai/groq-client'
import { buildSubjectContentPrompt } from '@/lib/ai/subjectPromptTemplates'
import { formatSubjectContent } from '@/lib/ai/contentFormatters'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/cache'
import { aiChain, AI_SSE_HEADERS } from '@/lib/ai/provider-fallback'
import { appendRagToSystemPrompt, buildRagContextForQuery } from '@/lib/ai/rag-context'
import { assertCurriculumTopicAllowed } from '@/lib/ai/curriculum-context'

const StoryWeaverInputSchema = z.object({
  grade: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']).optional(),
  subject: z.string().min(1).max(100).optional(),
  topic: z.string().min(3).max(200),
  storyType: z.enum(['story', 'fable', 'dialogue', 'poem']).default('story'),
  setting: z.string().min(1).max(100).optional(),
  length: z.string().min(1).max(50).default('4-5 paragraphs'),
  includeQuestions: z.boolean().optional().default(false),
  cbcCompetencies: z.array(z.string().min(1).max(80)).max(8).optional(),
  characters: z.array(z.string().min(1).max(60)).max(12).optional(),
  characterMode: z.enum(['auto', 'custom']).optional(),
  vocabularyWords: z.array(z.string().min(1).max(60)).max(20).optional(),
  languageMode: z.enum(['english', 'bilingual']).optional(),
  questionTypes: z
    .object({
      literal: z.boolean().optional(),
      inferential: z.boolean().optional(),
      evaluative: z.boolean().optional(),
    })
    .optional(),
  questionCount: z.number().int().min(1).max(10).optional(),
  vocabularyExercises: z.boolean().optional(),
  discussionPrompts: z.boolean().optional(),
  writingExtension: z.boolean().optional(),
})

type StoryWeaverInput = z.infer<typeof StoryWeaverInputSchema>

function buildPrompt(input: StoryWeaverInput): string {
  const gradeLabel = input.grade || 'Form 3'
  const subjectLabel = input.subject || 'English (Core)'

  return buildSubjectContentPrompt({
    subject: subjectLabel,
    grade: gradeLabel,
    topic: input.topic,
    length: input.length,
    storyType: input.storyType,
    setting: input.setting || 'Zambia',
    includeQuestions: input.includeQuestions,
    cbcCompetencies: input.cbcCompetencies,
    characters: input.characters,
    characterMode: input.characterMode,
    vocabularyWords: input.vocabularyWords,
    languageMode: input.languageMode,
    questionTypes: input.questionTypes,
    questionCount: input.questionCount,
    vocabularyExercises: input.vocabularyExercises,
    discussionPrompts: input.discussionPrompts,
    writingExtension: input.writingExtension,
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
      keyPrefix: 'ai_story_weaver_',
      keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
    })
    if (rl.isLimited) return rl.response as any

    const blocked = await requireFeature(schoolId, 'ai-story-weaver')
    if (blocked) return blocked as any

    const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
    if (limitBlock) return limitBlock as any

    try {
      assertGroqConfigured()
    } catch {
      logger.error('ai.story-weaver.misconfigured', new Error('Missing GROQ_API_KEY'), {
        requestId,
        schoolId,
      })
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
    }

    const raw = await request.json().catch(() => null)
    const parsed = StoryWeaverInputSchema.parse(raw)
    let topic = parsed.topic
    try {
      topic = await assertCurriculumTopicAllowed(
        parsed.subject || 'English',
        parsed.grade || 'Form 3',
        parsed.topic,
        { required: true }
      )
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid topic' },
        { status: 400 }
      )
    }
    const input = { ...parsed, topic }
    const guard = validateAIGuardrails({
      text: [
        input.subject || 'English',
        input.grade || 'Form 3',
        input.topic,
        input.storyType,
      ].join(' '),
    })
    if (guard.ok === false) return guard.response

    const cachePayload = { schoolId, input }
    const cached = await getCachedAIResponse<{
      story: string
      generatedBy?: string
      model?: string
    }>('ai-story-weaver', cachePayload)
    if (cached?.story) {
      const stream = aiChain.textToEventStream({
        text: cached.story,
        provider: cached.generatedBy || 'cache',
        model: cached.model || 'cache',
        plainText: true,
      })
      return new Response(stream, { headers: AI_SSE_HEADERS })
    }

    logger.info('ai.story-weaver.started', {
      requestId,
      schoolId,
      userId: user.id,
      storyType: input.storyType,
      grade: input.grade,
      subject: input.subject,
    })

    const promptBase = buildPrompt(input)
    // CDC syllabus RAG first (via buildRagContextForQuery). TM static-fallback is
    // optional enrichment only — Form 3–4 known-gaps must not imply story failure.
    const rag = await buildRagContextForQuery({
      query: `${input.subject || 'English'} ${input.topic}`,
      schoolId,
      schoolPlan: school.plan,
      subject: input.subject || 'English',
      gradeLevel: input.grade || 'Form 3',
      topic: input.topic,
    })
    const prompt = rag.block ? appendRagToSystemPrompt(promptBase, rag.block) : promptBase
    const startTime = Date.now()

    const stream = createGroqTextEventStream({
      prompt,
      maxTokens: 2200,
      temperature: 0.8,
      plainText: true,
      onErrorMessage: 'Failed to generate content',
      onComplete: async (responseText) => {
        const cleaned = formatSubjectContent({
          subject: input.subject || 'English (Core)',
          aiOutput: responseText,
        }).text
        await setCachedAIResponse('ai-story-weaver', cachePayload, {
          story: cleaned,
          generatedBy: 'groq',
        })
        await trackAIUsage(schoolId, 'ai-story-weaver')
        await prisma.aIRequest.create({
          data: {
            id: crypto.randomUUID(),
            schoolId,
            feature: 'ai-story-weaver',
            prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
            response: cleaned.length > 20000 ? cleaned.slice(0, 20000) : cleaned,
            tokens: 0,
          },
        })
        logger.info('ai.story-weaver.completed', {
          requestId,
          schoolId,
          userId: user.id,
          durationMs: Date.now() - startTime,
        })
      },
    })

    return new Response(stream, { headers: GROQ_SSE_HEADERS })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    logger.error('ai.story-weaver.error', error, { requestId })
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
})
