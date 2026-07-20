import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireChatAuth, loadChatSession } from '@/lib/ai/chat/session'
import { createLessonPlanSubmissionFromChat } from '@/lib/ai/chat/lesson-plan-submission'
import { roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const BodySchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
  subject: z.string().min(2).max(120),
  grade: z.string().min(1).max(60),
  topic: z.string().min(2).max(300),
  subTopic: z.string().max(300).optional(),
  duration: z.number().int().min(10).max(120).optional(),
  term: z.string().max(40).optional(),
  chatContext: z.string().max(4000).optional(),
})

/**
 * POST /api/chat/lesson-plans/generate-from-chat
 * Teacher/HOD: structured JSON → docx → R2/local → DRAFT LessonPlanSubmission
 */
export const POST = withErrorHandler(async function POST(request: Request) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Only teachers and HODs can generate lesson plans from chat', 403)
  }

  if (auth.chatRole === 'HEADTEACHER') {
    throw new ApiError(
      'Headteacher chat is retrieval-only — use teacher/HOD chat for lesson plans',
      403
    )
  }

  const raw = await request.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }
  const body = parsed.data

  if (body.sessionId) {
    const session = await loadChatSession({
      schoolId: auth.schoolId,
      sessionId: body.sessionId,
      userId: String(auth.user.id),
    })
    if (!session) throw new ApiError('Chat session not found', 404)
  }

  // Pull recent user messages as context when not provided
  let chatContext = body.chatContext || ''
  if (!chatContext && body.sessionId) {
    const db = getTenantClient(auth.schoolId)
    const msgs = await db.chatMessage.findMany({
      where: { sessionId: body.sessionId, schoolId: auth.schoolId, sender: 'USER' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { content: true },
    })
    chatContext = msgs
      .reverse()
      .map((m) => m.content)
      .join('\n')
      .slice(0, 4000)
  }

  const result = await createLessonPlanSubmissionFromChat({
    schoolId: auth.schoolId,
    teacherId: String(auth.user.id),
    sessionId: body.sessionId || null,
    subject: body.subject,
    grade: body.grade,
    topic: body.topic,
    subTopic: body.subTopic,
    duration: body.duration,
    term: body.term,
    chatContext,
  })

  return NextResponse.json({
    success: true,
    submission: {
      id: result.submission.id,
      status: result.submission.status,
      topic: result.submission.topic,
      subject: result.submission.subject,
      grade: result.submission.grade,
      diagramFailed: result.diagramFailed,
    },
    provider: result.provider,
    model: result.model,
    message:
      'Lesson plan generated. Use Download for a signed link, then Submit to HOD when ready.',
  })
})
