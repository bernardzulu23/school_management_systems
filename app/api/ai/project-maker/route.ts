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
import { assertGroqConfigured } from '@/lib/ai/groq-client'
import { generateAIObject, GROQ_STRUCTURED_MODEL } from '@/lib/ai/client'
import { ProjectGenerationSchema } from '@/lib/ai/schemas'
import { buildProjectPrompt } from '@/lib/ai/subject-adaptive-prompts'
import { appendRagToSystemPrompt, buildRagContextForQuery } from '@/lib/ai/rag-context'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { assertCurriculumTopicAllowed } from '@/lib/ai/curriculum-context'
import { ECZ_SBA_TASK_TYPES } from '@/lib/ecz/ecz-rubric-builder'

const PROJECT_SYSTEM =
  'You are an ECZ School-Based Assessment specialist for Zambian secondary schools. Create authentic project briefs with Zambian context and 4-level ECZ rubrics. Return only valid data matching the schema.'

/** Creative assessment generation — regenerating must yield a fresh brief. */
const PROJECT_TEMPERATURE = 0.7

const TASK_TYPE_VALUES = ECZ_SBA_TASK_TYPES.map((t) => t.value) as [string, ...string[]]

const ProjectMakerInputSchema = z.object({
  grade: z.string().min(1).max(40),
  subject: z.string().min(1).max(100),
  topic: z.string().min(3).max(200),
  taskType: z.enum(TASK_TYPE_VALUES).optional().default('Project'),
  resourceLevel: z.enum(['low', 'moderate', 'well-resourced']).optional().default('moderate'),
  materialIds: z.array(z.string().min(1)).max(5).optional(),
  variationSeed: z.string().min(1).max(80).optional(),
  forceRefresh: z.boolean().optional(),
})

type ProjectMakerInput = z.infer<typeof ProjectMakerInputSchema>

function buildPrompt(input: ProjectMakerInput, variationSeed: string): string {
  const base = buildProjectPrompt({
    subject: input.subject,
    grade: input.grade,
    topic: input.topic,
    taskType: input.taskType,
    resourceLevel: input.resourceLevel,
  })
  return `${base}\n\nProduce a fresh unique project brief (variation: ${variationSeed}). Do not reuse prior wording.`
}

function toUiCriteria(
  criteria: Array<{
    name: string
    description?: string
    excellent: string
    good: string
    fair: string
    needsImprovement: string
  }>
) {
  return criteria.map((c) => ({
    name: c.name,
    description: c.description || '',
    excellent: c.excellent,
    good: c.good,
    fair: c.fair,
    needs_improvement: c.needsImprovement,
    needsImpr: c.needsImprovement,
  }))
}

export const POST = withAILimits(async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    const user = await getAuthUser(request as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!roleCheck(user, ['TEACHER', 'HOD', 'ADMIN', 'teacher', 'hod', 'headteacher'])) {
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
      keyPrefix: 'ai_project_maker_',
      keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
    })
    if (rl.isLimited) return rl.response as any

    const blocked = await requireFeature(schoolId, 'ai-quiz-maker')
    if (blocked) return blocked as any

    const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
    if (limitBlock) return limitBlock as any

    try {
      assertGroqConfigured()
    } catch (configError) {
      logger.error('ai.project-maker.misconfigured', configError, { requestId, schoolId })
      return NextResponse.json(
        { error: 'AI service is not configured (set GROQ_API_KEY or GEMINI_API_KEY)' },
        { status: 503 }
      )
    }

    const raw = await request.json().catch(() => null)
    const parsedInput = ProjectMakerInputSchema.parse(raw)

    const formNum = Number(String(parsedInput.grade).replace(/\D/g, ''))
    if (formNum === 4) {
      return NextResponse.json(
        { error: 'Form 4 has no SBA projects — only the final examination applies.' },
        { status: 400 }
      )
    }

    let topic = parsedInput.topic
    try {
      topic = await assertCurriculumTopicAllowed(
        parsedInput.subject,
        parsedInput.grade,
        parsedInput.topic,
        { required: true }
      )
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid topic' },
        { status: 400 }
      )
    }
    const input = { ...parsedInput, topic }

    const guard = validateAIGuardrails({
      text: [input.subject, input.grade, input.topic, input.taskType].join(' '),
    })
    if (guard.ok === false) return guard.response

    // Never serve AiCache — regenerating projects must produce a new brief.
    const variationSeed = String(input.variationSeed || '').trim() || crypto.randomUUID()

    let prompt = buildPrompt(input, variationSeed)
    const rag = await buildRagContextForQuery({
      query: `${input.subject} ${input.grade} ${input.topic} SBA project assessment`,
      schoolId,
      schoolPlan: school.plan,
      subject: input.subject,
      materialIds: input.materialIds,
      gradeLevel: input.grade,
    })
    if (rag.block) {
      prompt = `${prompt}\n\n---\nSchool reference materials:\n${rag.block}`
    }

    const startTime = Date.now()
    const system = rag.block ? appendRagToSystemPrompt(PROJECT_SYSTEM, rag.block) : PROJECT_SYSTEM
    const models = [
      GROQ_STRUCTURED_MODEL,
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
    ].filter((m, i, a) => a.indexOf(m) === i)

    let project: z.infer<typeof ProjectGenerationSchema>
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

    try {
      const generated = await generateAIObject(ProjectGenerationSchema, system, prompt, {
        maxTokens: 3500,
        temperature: PROJECT_TEMPERATURE,
        models,
      })
      project = generated.object as z.infer<typeof ProjectGenerationSchema>
      usage = generated.usage
    } catch (genError) {
      logger.warn('ai.project-maker.structured-failed', {
        requestId,
        schoolId,
        message: genError instanceof Error ? genError.message : String(genError),
      })
      const { generateAIText } = await import('@/lib/ai/client')
      const { extractJSONObject } = await import('@/lib/ai/groq-client')
      const textResult = await generateAIText(
        `${prompt}\n\nRespond with ONLY valid JSON for an SBA project brief with title, context, instructions, steps[], deliverables[], timeline, materials[], demonstration, competencies[], and criteria[] (each with name, excellent, good, fair, needsImprovement).`,
        { system, maxTokens: 3500, temperature: PROJECT_TEMPERATURE, models }
      )
      const rawProject = extractJSONObject(textResult.text)
      usage = textResult.usage || usage
      const parsed = ProjectGenerationSchema.safeParse({
        ...rawProject,
        subject: rawProject?.subject || input.subject,
        form: rawProject?.form || input.grade,
        topic: rawProject?.topic || input.topic,
        taskType: rawProject?.taskType || input.taskType,
      })
      if (!parsed.success) throw genError
      project = parsed.data
    }

    project = {
      ...project,
      subject: project.subject || input.subject,
      form: project.form || input.grade,
      topic: project.topic || input.topic,
      taskType: project.taskType || input.taskType,
      title: project.title || `${input.subject} — ${input.topic} Project`,
    }

    await trackAIUsage(schoolId, 'ai-project-maker')
    await prisma.aIRequest.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        feature: 'ai-project-maker',
        prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
        response:
          JSON.stringify(project).length > 20000
            ? JSON.stringify(project).slice(0, 20000)
            : JSON.stringify(project),
        tokens: usage.outputTokens,
      },
    })

    logger.info('ai.project-maker.completed', {
      requestId,
      schoolId,
      userId: user.id,
      durationMs: Date.now() - startTime,
    })

    const contextBlock = [
      project.context,
      '',
      'Instructions:',
      project.instructions,
      '',
      'Steps:',
      ...(project.steps || []).map((s, i) => `${i + 1}. ${s}`),
      '',
      'Deliverables:',
      ...(project.deliverables || []).map((d) => `• ${d}`),
      '',
      `Timeline: ${project.timeline}`,
      project.materials?.length ? `Materials: ${project.materials.join('; ')}` : '',
      project.demonstration ? `Demonstration: ${project.demonstration}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    return NextResponse.json({
      success: true,
      project,
      context: contextBlock,
      rubricCriteria: toUiCriteria(project.criteria || []),
      ragReferences: rag.refs?.length ? rag.refs : undefined,
      materialIds: rag.materialIds?.length ? rag.materialIds : input.materialIds,
      variationSeed,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    logger.error('ai.project-maker.error', error, { requestId })
    const message = error instanceof Error ? error.message : 'Failed to process request'
    const status = message.toLowerCase().includes('ai generation failed') ? 502 : 500
    return NextResponse.json({ error: message }, { status })
  }
})
