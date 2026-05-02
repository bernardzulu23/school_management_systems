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
  competenceFocus: z.string().max(300).optional(),
  additionalInstructions: z.string().max(800).optional(),
})

type LessonPlannerInput = z.infer<typeof LessonPlannerInputSchema>

function buildPrompt(input: LessonPlannerInput): string {
  const prior = input.priorKnowledge ? `Pre-requisite knowledge: ${input.priorKnowledge}` : ''
  const subtopic = input.subtopic ? input.subtopic : '—'
  const learners = Number.isFinite(input.learners) ? String(input.learners) : '—'
  const term = input.term ? String(input.term) : '—'
  const competenceFocus = input.competenceFocus
    ? String(input.competenceFocus)
    : 'Critical Thinking and Problem Solving'
  const extras = input.additionalInstructions ? String(input.additionalInstructions) : ''

  const templatePreambles: Record<string, string> = {
    standard:
      "You are an expert Zambian teacher educator. Generate a COMPLETE, detailed Competency-Based Curriculum (CBC) lesson plan following the 2023 Zambia Education Curriculum Framework (ZECF) and Teachers' Curriculum Implementation Guide (TCIG).",
    science:
      'You are an expert Zambian science teacher educator. Generate a COMPLETE CBC lesson plan for a PRACTICAL SCIENCE LAB lesson. Include: safety precautions, hypothesis, materials list, experimental procedure, observation table, and a practical skills assessment rubric. Follow the 2023 ZECF.',
    language:
      'You are an expert Zambian language teacher educator. Generate a COMPLETE CBC lesson plan for a LANGUAGE SKILLS lesson covering Listening, Speaking, Reading, Writing (LSRW). Include oral activities, text analysis, and writing tasks. Follow 2023 ZECF.',
    business:
      'You are an expert Zambian business education teacher. Generate a COMPLETE CBC lesson plan for a BUSINESS subject lesson. Include case studies from Zambian business context, calculations/document completion tasks, and entrepreneurship linkages. Follow 2023 ZECF.',
    practical:
      'You are an expert Zambian practical subjects teacher. Generate a COMPLETE CBC lesson plan for a WORKSHOP/PRACTICAL SKILLS lesson. Include: workshop safety rules, tool list, step-by-step practical procedure, safety precautions, product quality assessment rubric. Follow 2023 ZECF.',
    humanities:
      'You are an expert Zambian humanities teacher. Generate a COMPLETE CBC lesson plan for a HUMANITIES lesson. Include: source analysis, map work/timeline where relevant, debate/discussion activity, Zambian context, citizenship values. Follow 2023 ZECF.',
    arts: 'You are an expert Zambian arts teacher. Generate a COMPLETE CBC lesson plan for an ARTS/MUSIC lesson. Include: Zambian cultural context, creative production/performance task, reflection, and portfolio-based assessment. Follow 2023 ZECF.',
    technology:
      'You are an expert Zambian ICT/Technology teacher. Generate a COMPLETE CBC lesson plan for a TECHNOLOGY lesson. Include: step-by-step practical task, digital literacy and cybersafety link, ICT tool specification, and project-based assessment. Follow 2023 ZECF.',
    mathematics:
      'You are an expert Zambian mathematics teacher educator. Generate a COMPLETE CBC lesson plan for a MATHEMATICS PROBLEM-BASED lesson. Include: real-life Zambian context problems, mental math warm-up, discovery activity, worked examples, differentiated practice (basic/intermediate/challenging). Follow 2023 ZECF.',
  }

  const preamble = templatePreambles[input.templateType] || templatePreambles.standard

  return `${preamble}

Use the EXACT output structure and headings below. Do NOT output HTML. Write in clear English and include Zambian-local examples where relevant.

LESSON PLAN HEADER
- School Name: [School Name]
- Subject: ${input.subject}
- Grade/Form: ${input.grade}
- Topic: ${input.topic}
- Sub-topic: ${subtopic}
- Date: [Date]
- Duration: ${input.duration} minutes
- Number of Learners: ${learners}
- Term: ${term}

1. GENERAL COMPETENCE
2. SPECIFIC COMPETENCE(S) (aligned to: ${competenceFocus})
3. LEARNING OUTCOMES (Know-Do-Value)
4. CORE VALUES ADDRESSED (Personal Excellence, Relationships, Citizenship, Faith in God)
5. PRE-REQUISITE KNOWLEDGE
6. TEACHING & LEARNING MATERIALS (TLMs)
7. CROSS-CUTTING ISSUES
8. INTRODUCTION (Time + Teacher Activities + Learner Activities)
9. MAIN LESSON DEVELOPMENT (Step-by-step with timing; include learner-centered activities)
10. ASSESSMENT (Formative + simple rubric/checklist; SBA ideas)
11. DIFFERENTIATION / INCLUSION
12. HOMEWORK / EXTENSION
13. REFLECTION (Teacher reflection + learner reflection prompt)

Learning style preference: ${input.learningStyle}.
${prior}
${extras ? `Additional instructions: ${extras}` : ''}`
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
