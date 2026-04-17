import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
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

const LessonPlannerInputSchema = z.object({
  grade: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']),
  subject: z.string().min(1).max(100),
  topic: z.string().min(3).max(200),
  duration: z.number().int().min(1).max(240),
  learningStyle: z.enum(['mixed', 'visual', 'kinesthetic', 'auditory']).default('mixed'),
  priorKnowledge: z.string().max(300).optional(),
})

type LessonPlannerInput = z.infer<typeof LessonPlannerInputSchema>

function buildPrompt(input: LessonPlannerInput): string {
  const prior = input.priorKnowledge ? `Prior Knowledge: ${input.priorKnowledge}` : ''
  return `You are a Zambian curriculum specialist creating lesson plans aligned to the Competency-Based Curriculum (CBC).

Create a complete, detailed lesson plan with these exact sections:

## LESSON INFO
Subject: ${input.subject}
Grade: ${input.grade}
Topic: ${input.topic}
Duration: ${input.duration} minutes
Learning Style: ${input.learningStyle}
${prior}

## LEARNING OBJECTIVES (CBC COMPETENCIES)
List 3-4 measurable objectives aligned to CBC competencies (critical thinking, creativity, collaboration, communication).

## MATERIALS AND RESOURCES
Include locally available materials (Zambian context).

## LESSON OUTLINE
### Introduction / Starter
### Main Teaching Activities
### Group Work / Learner Activities
### Closure / Reflection

## ASSESSMENT (FORMATIVE)
Observation checklist + quick exit ticket.

## DIFFERENTIATION
Support for mixed-ability learners.

Write in clear English and include Zambian examples where relevant.`
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
      keyPrefix: 'ai_lesson_planner_',
      keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
    })
    if (rl.isLimited) return rl.response as any

    const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
    if (blocked) return blocked as any

    const limitBlock = await checkAILimit(schoolId)
    if (limitBlock) return limitBlock as any

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ai.lesson-planner.misconfigured', new Error('Missing ANTHROPIC_API_KEY'), {
        requestId,
        schoolId,
      })
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
    }

    const raw = await request.json().catch(() => null)
    const input = LessonPlannerInputSchema.parse(raw)

    logger.info('ai.lesson-planner.started', {
      requestId,
      schoolId,
      userId: user.id,
      grade: input.grade,
      subject: input.subject,
    })

    const prompt = buildPrompt(input)
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let responseText = ''
        const startTime = Date.now()

        try {
          const claudeStream = await client.messages.stream({
            model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }],
          })

          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const chunk = String(event.delta.text || '')
              responseText += chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
            }
          }

          await trackAIUsage(schoolId, 'ai-lesson-planner')
          await prisma.aIRequest.create({
            data: {
              id: crypto.randomUUID(),
              schoolId,
              feature: 'ai-lesson-planner',
              prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
              response: responseText.length > 20000 ? responseText.slice(0, 20000) : responseText,
              tokens: 0,
            },
          })

          logger.info('ai.lesson-planner.completed', {
            requestId,
            schoolId,
            userId: user.id,
            durationMs: Date.now() - startTime,
          })

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          logger.error('ai.lesson-planner.stream-error', error, {
            requestId,
            schoolId,
            userId: user.id,
          })
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Failed to generate lesson plan' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }

    logger.error('ai.lesson-planner.error', error, { requestId })
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
