import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import {
  checkAILimit,
  getPerMinuteLimit,
  getSchoolPlanForUsage,
  trackAIUsage,
} from '@/lib/middleware/aiUsageTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowedRoles = ['teacher', 'hod', 'headteacher', 'administrator', 'admin']
  if (!allowedRoles.includes(String(user.role || '').toLowerCase())) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const perMinuteLimit = getPerMinuteLimit(school.plan)
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai_story_weaver_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'ai-story-weaver')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId)
  if (limitBlock) return limitBlock

  const body = await request.json().catch(() => ({}))
  const grade = String(body?.grade || '').trim()
  const subject = String(body?.subject || '').trim()
  const topic = String(body?.topic || '').trim()
  const storyType = String(body?.storyType || 'story').trim()
  const setting = String(body?.setting || '').trim()
  const length = String(body?.length || '4-5 paragraphs').trim()
  const includeQuestions = body?.includeQuestions === true

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
  }

  const typeInstructions = {
    story:
      'Write an engaging narrative story with named Zambian characters, a clear plot, and a moral or educational lesson.',
    fable:
      'Write a fable using animals native to Zambia (elephant, crocodile, eagle, lion, etc.) that teaches the concept through their actions.',
    dialogue:
      'Write a realistic conversation between 2-3 Zambian students or community members that explores and explains the topic naturally.',
    poem: 'Write an educational poem with rhyme and rhythm that teaches the concept in a memorable way.',
  }

  const prompt = `You are an educational content writer for Zambian secondary schools.

Create a ${storyType} for ${grade || 'secondary'} students studying ${subject || 'the subject'}.
Topic: ${topic}
Setting: ${setting || 'Zambia'}
Length: ${length}

Instructions:
- ${typeInstructions[storyType] || typeInstructions.story}
- Use authentic Zambian names (e.g., Chanda, Mwamba, Nalumino, Bwalya, Thandiwe, Mutale)
- Reference real Zambian places, foods, customs, and culture where relevant
- Make the educational content accurate and aligned with the Zambian curriculum
- Write in clear, accessible English appropriate for ${grade || 'secondary'} students
- The story should naturally teach or reinforce the topic without being preachy
${
  includeQuestions
    ? `
After the story, add:
---
COMPREHENSION QUESTIONS:
1. [A recall question]
2. [An inference/understanding question]
3. [A discussion/critical thinking question]
4. [A question connecting to real life in Zambia]`
    : ''
}

Write the ${storyType} now:`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let responseText = ''
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
            const data = JSON.stringify({ text: chunk })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
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
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err?.message || 'Failed to generate story' })}\n\n`
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
}
