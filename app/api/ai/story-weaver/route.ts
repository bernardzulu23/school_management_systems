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

const StoryWeaverInputSchema = z.object({
  grade: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']).optional(),
  subject: z.string().min(1).max(100).optional(),
  topic: z.string().min(3).max(200),
  storyType: z.enum(['story', 'fable', 'dialogue', 'poem']).default('story'),
  setting: z.string().min(1).max(100).optional(),
  length: z.string().min(1).max(50).default('4-5 paragraphs'),
  includeQuestions: z.boolean().optional().default(false),
})

type StoryWeaverInput = z.infer<typeof StoryWeaverInputSchema>

function buildPrompt(input: StoryWeaverInput): string {
  const typeInstructions: Record<string, string> = {
    story:
      'Write an engaging narrative story with named Zambian characters, a clear plot, and a moral or educational lesson.',
    fable:
      'Write a fable using animals native to Zambia (elephant, crocodile, eagle, lion, etc.) that teaches the concept through their actions.',
    dialogue:
      'Write a realistic conversation between 2-3 Zambian students or community members that explores and explains the topic naturally.',
    poem: 'Write an educational poem with rhyme and rhythm that teaches the concept in a memorable way.',
  }

  const gradeLabel = input.grade || 'secondary'
  const subjectLabel = input.subject || 'the subject'
  const settingLabel = input.setting || 'Zambia'

  const questions = input.includeQuestions
    ? `

After the story, add:
---
COMPREHENSION QUESTIONS:
1. [A recall question]
2. [An inference/understanding question]
3. [A discussion/critical thinking question]
4. [A question connecting to real life in Zambia]`
    : ''

  return `You are an educational content writer for Zambian secondary schools.

Create a ${input.storyType} for ${gradeLabel} students studying ${subjectLabel}.
Topic: ${input.topic}
Setting: ${settingLabel}
Length: ${input.length}

Instructions:
- ${typeInstructions[input.storyType] || typeInstructions.story}
- Use authentic Zambian names (e.g., Chanda, Mwamba, Nalumino, Bwalya, Thandiwe, Mutale)
- Reference real Zambian places, foods, customs, and culture where relevant
- Make the educational content accurate and aligned with the Zambian curriculum
- Write in clear, accessible English appropriate for ${gradeLabel} students
- The story should naturally teach or reinforce the topic without being preachy${questions}

Write the ${input.storyType} now:`
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
      keyPrefix: 'ai_story_weaver_',
      keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
    })
    if (rl.isLimited) return rl.response as any

    const blocked = await requireFeature(schoolId, 'ai-story-weaver')
    if (blocked) return blocked as any

    const limitBlock = await checkAILimit(schoolId)
    if (limitBlock) return limitBlock as any

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ai.story-weaver.misconfigured', new Error('Missing ANTHROPIC_API_KEY'), {
        requestId,
        schoolId,
      })
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
    }

    const raw = await request.json().catch(() => null)
    const input = StoryWeaverInputSchema.parse(raw)

    logger.info('ai.story-weaver.started', {
      requestId,
      schoolId,
      userId: user.id,
      storyType: input.storyType,
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
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
          })

          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const chunk = String(event.delta.text || '')
              responseText += chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
            }
          }

          await trackAIUsage(schoolId, 'ai-story-weaver')
          await prisma.aIRequest.create({
            data: {
              id: crypto.randomUUID(),
              schoolId,
              feature: 'ai-story-weaver',
              prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
              response: responseText.length > 20000 ? responseText.slice(0, 20000) : responseText,
              tokens: 0,
            },
          })

          logger.info('ai.story-weaver.completed', {
            requestId,
            schoolId,
            userId: user.id,
            durationMs: Date.now() - startTime,
          })

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          logger.error('ai.story-weaver.stream-error', error, {
            requestId,
            schoolId,
            userId: user.id,
          })
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Failed to generate story' })}\n\n`)
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
    logger.error('ai.story-weaver.error', error, { requestId })
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
