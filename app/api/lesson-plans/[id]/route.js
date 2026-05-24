import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { sanitizeText } from '@/lib/lesson-plans/text'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = normalize(routeParams?.id)
  if (!id) throw new ApiError('id is required', 400)

  const plan = await prisma.lessonPlan.findFirst({
    where: { id, schoolId },
    select: {
      id: true,
      status: true,
      grade: true,
      subject: true,
      topic: true,
      subTopic: true,
      duration: true,
      term: true,
      templateType: true,
      content: true,
      approvalNotes: true,
      version: true,
      createdAt: true,
      submittedAt: true,
      approvedAt: true,
      rejectedAt: true,
      rejectionReason: true,
      createdByUserId: true,
      reviewerUserId: true,
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  if (!plan) throw new ApiError('Not found', 404)

  const isOwner = String(plan.createdByUserId) === userId
  const isReviewer = String(plan.reviewerUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isOwner && !isReviewer && !isAdmin) throw new ApiError('Forbidden', 403)

  const teacherContext = await getLessonPlanTeacherContext(
    plan.createdByUserId,
    schoolId,
    plan.subject
  )

  return NextResponse.json({
    success: true,
    data: {
      ...plan,
      teacherContext,
    },
  })
})

const EDITABLE_STATUSES = new Set(['DRAFT', 'REJECTED', 'REVISION_REQUESTED'])

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = normalize(routeParams?.id)
  const body = await request.json().catch(() => ({}))
  const content = body?.content != null ? sanitizeText(String(body.content)) : null

  if (!content?.trim()) throw new ApiError('content is required', 400)

  const existing = await prisma.lessonPlan.findFirst({ where: { id, schoolId } })
  if (!existing) throw new ApiError('Not found', 404)

  const isOwner = String(existing.createdByUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isOwner && !isAdmin) throw new ApiError('Forbidden', 403)

  if (!EDITABLE_STATUSES.has(String(existing.status))) {
    throw new ApiError(`Cannot edit lesson plan with status: ${existing.status}`, 400)
  }

  const updated = await prisma.lessonPlan.update({
    where: { id },
    data: {
      content,
      version: { increment: 1 },
      ...(body?.topic ? { topic: normalize(body.topic) } : {}),
      ...(body?.subTopic != null ? { subTopic: normalize(body.subTopic) || null } : {}),
      ...(body?.grade ? { grade: normalize(body.grade) } : {}),
      ...(body?.subject ? { subject: normalize(body.subject) } : {}),
    },
    select: {
      id: true,
      status: true,
      grade: true,
      subject: true,
      topic: true,
      subTopic: true,
      content: true,
      version: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = normalize(routeParams?.id)
  if (!id) throw new ApiError('id is required', 400)

  const body = await request.json().catch(() => ({}))
  const action = normalize(body?.action).toLowerCase()
  const reason = normalize(body?.reason || body?.rejectionReason)
  const approvalNotes = normalize(body?.approvalNotes) || null

  const allowed = ['approve', 'reject', 'request_revision', 'revision']
  if (!allowed.includes(action)) {
    throw new ApiError('action must be approve, reject, or request_revision', 400)
  }
  if ((action === 'reject' || action === 'request_revision' || action === 'revision') && !reason) {
    throw new ApiError('reason is required', 400)
  }

  const existing = await prisma.lessonPlan.findFirst({
    where: { id, schoolId },
    select: {
      id: true,
      status: true,
      createdByUserId: true,
      reviewerUserId: true,
      grade: true,
      subject: true,
      topic: true,
    },
  })
  if (!existing) throw new ApiError('Not found', 404)

  if (String(existing.status) !== 'SUBMITTED') {
    throw new ApiError(`Cannot review lesson plan with status: ${existing.status}`, 400)
  }

  const isReviewer = String(existing.reviewerUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isReviewer && !isAdmin) throw new ApiError('Forbidden', 403)

  const now = new Date()
  let next
  let title
  let message

  if (action === 'approve') {
    next = {
      status: 'APPROVED',
      approvedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      approvalNotes,
    }
    title = 'Lesson Plan Approved'
    message = `${existing.subject} • ${existing.grade} • Approved`
  } else if (action === 'request_revision' || action === 'revision') {
    next = {
      status: 'REVISION_REQUESTED',
      rejectedAt: now,
      approvedAt: null,
      rejectionReason: reason,
      approvalNotes: null,
    }
    title = 'Lesson Plan — Revisions Requested'
    message = `${existing.subject} • ${existing.grade} • Revisions needed: ${reason}`
  } else {
    next = {
      status: 'REJECTED',
      rejectedAt: now,
      approvedAt: null,
      rejectionReason: reason,
      approvalNotes: null,
    }
    title = 'Lesson Plan Rejected'
    message = `${existing.subject} • ${existing.grade} • Rejected: ${reason}`
  }

  const updated = await prisma.lessonPlan.update({
    where: { id },
    data: next,
    select: {
      id: true,
      status: true,
      grade: true,
      subject: true,
      topic: true,
      createdByUserId: true,
      reviewerUserId: true,
      approvedAt: true,
      rejectedAt: true,
      rejectionReason: true,
      approvalNotes: true,
    },
  })

  await prisma.timetableNotification.create({
    data: {
      schoolId,
      fromUserId: userId,
      toUserId: existing.createdByUserId,
      type: 'lesson_plan',
      title,
      message,
      meta: {
        lessonPlanId: existing.id,
        status: updated.status,
        rejectionReason: updated.rejectionReason || null,
        approvalNotes: updated.approvalNotes || null,
      },
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
