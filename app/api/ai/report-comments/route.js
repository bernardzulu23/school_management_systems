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
    keyPrefix: 'ai_report_comments_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'ai-report-comments')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId)
  if (limitBlock) return limitBlock

  const body = await request.json().catch(() => ({}))
  const studentName = String(body?.studentName || '').trim()
  const grade = String(body?.grade || '').trim()
  const subject = String(body?.subject || '').trim()
  const marks = body?.marks
  const maxMarks = body?.maxMarks
  const behavior = String(body?.behavior || 'Good').trim()
  const attendance = String(body?.attendance || 'Regular').trim()
  const strengths = Array.isArray(body?.strengths) ? body.strengths.map(String).filter(Boolean) : []
  const areasForImprovement = Array.isArray(body?.areasForImprovement)
    ? body.areasForImprovement.map(String).filter(Boolean)
    : []

  if (!studentName || !grade || !subject || marks === undefined || maxMarks === undefined) {
    return NextResponse.json(
      { error: 'studentName, grade, subject, marks, maxMarks required' },
      { status: 400 }
    )
  }

  const percentage =
    Number(maxMarks) > 0 ? ((Number(marks) / Number(maxMarks)) * 100).toFixed(1) : '0.0'

  const prompt = `Generate a meaningful report comment for a Zambian student.

Student: ${studentName}
Grade: ${grade}
Subject: ${subject}
Performance: ${marks}/${maxMarks} (${percentage}%)
Behavior: ${behavior}
Attendance: ${attendance}
Strengths: ${(strengths || []).join(', ')}
Areas for Improvement: ${(areasForImprovement || []).join(', ')}

Write a personalized, encouraging comment:
- 3-4 sentences
- Simple English (teachers/parents will read it)
- Positive even if marks are low
- Reference CBC competencies where relevant
- Do NOT include marks or percentages.`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let responseText = ''
      try {
        const claudeStream = await client.messages.stream({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: 500,
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

        await trackAIUsage(schoolId, 'ai-report-comments')
        await prisma.aIRequest.create({
          data: {
            id: crypto.randomUUID(),
            schoolId,
            feature: 'ai-report-comments',
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
            `data: ${JSON.stringify({ error: err?.message || 'Failed to generate comment' })}\n\n`
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
