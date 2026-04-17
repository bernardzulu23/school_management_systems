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

const QuizMakerInputSchema = z.object({
  grade: z.enum(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']),
  subject: z.string().min(1).max(100),
  topic: z.string().min(3).max(200),
  questionCount: z.number().int().min(1).max(30).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
})

type QuizMakerInput = z.infer<typeof QuizMakerInputSchema>

function extractTextFromClaudeMessage(message: any): string {
  const blocks = Array.isArray(message?.content) ? message.content : []
  return blocks
    .map((b) => {
      if (b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string')
        return b.text
      return ''
    })
    .join('')
}

function extractJSONObject(text: string) {
  const s = String(text || '').trim()
  if (!s) return null

  const fenced = s.match(/```json\s*([\s\S]*?)\s*```/i) || s.match(/```\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : s

  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null
  const jsonText = candidate.slice(first, last + 1)
  try {
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

function buildPrompt(input: QuizMakerInput): string {
  return `Create a formative quiz for Zambian students and return ONLY valid JSON.

Grade: ${input.grade}
Subject: ${input.subject}
Topic: ${input.topic}
Difficulty: ${input.difficulty}
Question Count: ${input.questionCount}
Curriculum: CBC (Competency-Based)

Return JSON with this shape:
{
  "title": "string",
  "grade": "string",
  "subject": "string",
  "topic": "string",
  "totalMarks": number,
  "questions": [
    {
      "id": "q1",
      "type": "mcq|short|true_false",
      "question": "string",
      "options": ["string"] (only for mcq),
      "answer": "string",
      "marks": number,
      "competencies": ["string"],
      "explanation": "string"
    }
  ]
}

Rules:
- Keep language age-appropriate for ${input.grade}
- Include at least 2 critical-thinking questions
- Reference Zambian context where appropriate
- Do not include markdown, code fences, or any extra text.`
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

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ai.quiz-maker.misconfigured', new Error('Missing ANTHROPIC_API_KEY'), {
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
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const startTime = Date.now()
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = extractTextFromClaudeMessage(message)
    const quiz = extractJSONObject(text)
    if (!quiz || !Array.isArray(quiz.questions)) {
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
        response: text.length > 20000 ? text.slice(0, 20000) : text,
        tokens: Number((message as any)?.usage?.output_tokens || 0),
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
