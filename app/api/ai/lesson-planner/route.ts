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
import {
  assertGroqConfigured,
  createGroqTextEventStream,
  GROQ_SSE_HEADERS,
} from '@/lib/ai/groq-client'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'

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

    try {
      assertGroqConfigured()
    } catch {
      logger.error('ai.lesson-planner.misconfigured', new Error('Missing GROQ_API_KEY'), {
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
    const startTime = Date.now()

    const stream = createGroqTextEventStream({
      prompt,
      maxTokens: 4500,
      temperature: 0.7,
      meta: rag.refs?.length ? { ragReferences: rag.refs } : undefined,
      onErrorMessage: 'Failed to generate lesson plan',
      onComplete: async (responseText) => {
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
      },
    })

    return new Response(stream, { headers: GROQ_SSE_HEADERS })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }

    logger.error('ai.lesson-planner.error', error, { requestId })
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
