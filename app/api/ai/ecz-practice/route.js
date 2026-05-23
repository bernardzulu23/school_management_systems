export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import {
  checkAILimit,
  getPerMinuteLimit,
  getSchoolPlanForUsage,
  trackAIUsage,
} from '@/lib/middleware/aiUsageTracker'
import { assertGroqConfigured, extractJSONObject, groqChatCompletion } from '@/lib/ai/groq-client'

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (
    !roleCheck(user, [
      'STUDENT',
      'student',
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const perMinuteLimit = getPerMinuteLimit(school.plan)
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai_ecz_practice_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'ecz-practice')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId)
  if (limitBlock) return limitBlock

  try {
    assertGroqConfigured()
  } catch {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const subject = String(body?.subject || '').trim()
  const examLevel = String(body?.examLevel || body?.level || '').trim() || 'grade9'
  const topic = String(body?.topic || '').trim()
  const questionCount = Number(body?.questionCount ?? 5)

  if (!subject || !topic) {
    return NextResponse.json({ error: 'subject and topic required' }, { status: 400 })
  }

  const count =
    Number.isFinite(questionCount) && questionCount > 0 ? Math.min(20, questionCount) : 5
  const prompt = `Create ECZ-style practice questions for Zambian students and return ONLY valid JSON.

Subject: ${subject}
Exam Level: ${examLevel} (grade9 or grade12)
Topic: ${topic}
Question Count: ${count}

Return JSON with this shape:
{
  "paper": {
    "examInfo": {
      "subject": "string",
      "level": "string",
      "topic": "string",
      "totalMarks": number,
      "timeAllowed": "string"
    },
    "questions": [
      {
        "id": "q1",
        "type": "mcq|short|structured",
        "question": "string",
        "options": ["string"] (only for mcq),
        "marks": number,
        "answer": "string",
        "explanation": "string"
      }
    ]
  }
}

Rules:
- Match ECZ tone and difficulty for the level
- Include marking guidance in 'answer' and 'explanation'
- Do not include markdown, code fences, or any extra text.`

  try {
    const { content, usage } = await groqChatCompletion({
      prompt,
      maxTokens: 2500,
      temperature: 0.4,
    })

    const parsed = extractJSONObject(content)
    const paper = parsed?.paper
    if (!paper || !Array.isArray(paper.questions)) {
      return NextResponse.json({ error: 'AI returned invalid ECZ JSON' }, { status: 502 })
    }

    await trackAIUsage(schoolId, 'ecz-practice')
    await prisma.aIRequest.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        feature: 'ecz-practice',
        prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
        response: content.length > 20000 ? content.slice(0, 20000) : content,
        tokens: usage.completionTokens,
      },
    })

    return NextResponse.json({ success: true, paper })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate practice paper' },
      { status: 500 }
    )
  }
}
