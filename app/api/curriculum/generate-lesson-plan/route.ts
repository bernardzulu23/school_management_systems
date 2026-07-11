import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { checkAILimit, getSchoolPlanForUsage, trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { assertGroqConfigured } from '@/lib/ai/groq-client'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { generateLessonPlan } from '@/lib/curriculum/lessonPlanGenerator'
import { exportLessonPlanToWord } from '@/lib/curriculum/lessonPlanExport'
import { resolveCurriculum } from '@/lib/curriculum/resolveCurriculum'

export const dynamic = 'force-dynamic'

const InputSchema = z.object({
  subject: z.string().min(1).max(100),
  grade: z.union([z.string(), z.number()]),
  topic: z.string().min(1).max(200),
  unit: z.string().max(200).optional(),
  term: z.string().max(40).optional(),
  week: z.number().int().min(1).max(16).optional(),
  duration: z.number().int().min(20).max(120).optional(),
  teacherNotes: z.string().max(800).optional(),
  learningOutcomes: z.array(z.string().max(300)).max(12).optional(),
  persist: z.boolean().optional().default(true),
  uploadBlob: z.boolean().optional().default(true),
})

export const POST = withErrorHandler(async function POST(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
  if (limitBlock) return limitBlock

  try {
    assertGroqConfigured()
  } catch {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const raw = await request.json().catch(() => null)
  const input = InputSchema.parse(raw)
  const grade = String(input.grade)

  const school = await getSchoolPlanForUsage(schoolId)
  const rag = await buildRagContextForQuery({
    query: `${input.subject} ${grade} ${input.topic} lesson plan`,
    schoolId,
    schoolPlan: school?.plan,
    subject: input.subject,
  })

  let outcomes = input.learningOutcomes || []
  if (!outcomes.length) {
    const curriculum = await resolveCurriculum({
      schoolId,
      subject: input.subject,
      gradeOrForm: grade,
    })
    if (!curriculum.units.length && curriculum.source === 'json' && !curriculum.topics.length) {
      // Soft continue — generator still works without syllabus match
    } else {
      const match = curriculum.units.find(
        (u) =>
          u.title.toLowerCase().includes(input.topic.toLowerCase()) ||
          u.topics.some((t) => t.toLowerCase().includes(input.topic.toLowerCase()))
      )
      if (match?.outcomes?.length) outcomes = match.outcomes.slice(0, 8)
    }
  }

  let generated
  try {
    generated = await generateLessonPlan({
      schoolId,
      subject: input.subject,
      grade,
      unit: input.unit,
      topic: input.topic,
      learningOutcomes: outcomes,
      duration: input.duration || 40,
      teacherNotes: input.teacherNotes,
      term: input.term,
      ragBlock: rag.block,
    })
  } catch (err: any) {
    if (err?.response) return err.response
    throw err
  }

  const ctx = await getLessonPlanTeacherContext(String(user.id), schoolId, input.subject)

  let lessonPlanId: string | null = null
  if (input.persist !== false) {
    const row = await prisma.lessonPlan.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        createdByUserId: String(user.id),
        grade,
        subject: input.subject,
        topic: input.topic,
        subTopic: input.unit || input.topic,
        duration: input.duration || 40,
        term: input.term || 'Term 1',
        weekNumber: input.week ?? null,
        templateType: 'curriculum-studio',
        content: generated.content,
        structuredContent: generated.structuredContent as object,
        generatedAt: new Date(),
        aiModel: generated.aiModel || null,
      },
    })
    lessonPlanId = row.id
  }

  const wordBuffer = await exportLessonPlanToWord({
    subject: input.subject,
    grade,
    topic: input.topic,
    duration: input.duration || 40,
    schoolName: ctx.schoolName,
    teacherName: ctx.teacherName,
    content: generated.content,
    structuredContent: generated.structuredContent,
  })

  let downloadUrl: string | null = null
  if (input.uploadBlob !== false && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const filename =
        `lesson-plans/${schoolId}/${input.subject}-${grade}-${input.topic}-${Date.now()}.docx`
          .replace(/[^a-zA-Z0-9/._\- ]/g, '')
          .slice(0, 180)
      const blob = await put(filename, wordBuffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      downloadUrl = blob.url
    } catch {
      downloadUrl = null
    }
  }

  await trackAIUsage(schoolId, 'ai-lesson-planner')

  return NextResponse.json({
    success: true,
    lessonPlan: generated.structuredContent,
    content: generated.content,
    lessonPlanId,
    downloadUrl,
    fromCache: generated.fromCache,
    wordBase64: downloadUrl ? undefined : Buffer.from(wordBuffer).toString('base64'),
    ragReferences: rag.refs?.length ? rag.refs : undefined,
  })
})
