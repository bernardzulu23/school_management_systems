import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import {
  checkAILimit,
  getPerMinuteLimit,
  getSchoolPlanForUsage,
  trackAIUsage,
} from '@/lib/middleware/aiUsageTracker'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'HOD', 'ADMIN'])) {
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
    keyPrefix: 'ai_lesson_planner_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId)
  if (limitBlock) return limitBlock

  const body = await request.json().catch(() => ({}))
  const grade = String(body?.grade || '').trim()
  const subject = String(body?.subject || '').trim()
  const topic = String(body?.topic || '').trim()
  const duration = Number(body?.duration || 0)
  const learningStyle = String(body?.learningStyle || 'mixed').trim()
  const priorKnowledge = String(body?.priorKnowledge || '').trim()

  if (!grade || !subject || !topic || !Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json({ error: 'grade, subject, topic, duration required' }, { status: 400 })
  }

  const prompt = `You are a Zambian curriculum specialist creating lesson plans aligned to the Competency-Based Curriculum (CBC).

Create a complete, detailed lesson plan with these exact sections:

## LESSON INFO
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Duration: ${duration} minutes
Learning Style: ${learningStyle}
${priorKnowledge ? `Prior Knowledge: ${priorKnowledge}` : ''}

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

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let responseText = ''
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
            const data = JSON.stringify({ text: chunk })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
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
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err?.message || 'Failed to generate lesson' })}\n\n`
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
