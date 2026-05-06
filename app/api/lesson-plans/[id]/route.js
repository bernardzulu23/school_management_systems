import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const auth = authMiddleware(request)
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
      templateType: true,
      content: true,
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

  return NextResponse.json({ success: true, data: plan })
})

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const routeParams = await params
  const auth = authMiddleware(request)
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
  const reason = normalize(body?.reason)

  if (!['approve', 'reject'].includes(action)) {
    throw new ApiError('action must be approve or reject', 400)
  }
  if (action === 'reject' && !reason) {
    throw new ApiError('reason is required when rejecting', 400)
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

  const isReviewer = String(existing.reviewerUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isReviewer && !isAdmin) throw new ApiError('Forbidden', 403)

  const now = new Date()
  const next =
    action === 'approve'
      ? {
          status: 'APPROVED',
          approvedAt: now,
          rejectedAt: null,
          rejectionReason: null,
        }
      : {
          status: 'REJECTED',
          rejectedAt: now,
          approvedAt: null,
          rejectionReason: reason,
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
    },
  })

  await prisma.timetableNotification.create({
    data: {
      schoolId,
      fromUserId: userId,
      toUserId: existing.createdByUserId,
      type: 'lesson_plan',
      title: action === 'approve' ? 'Lesson Plan Approved' : 'Lesson Plan Rejected',
      message:
        action === 'approve'
          ? `${existing.subject} • ${existing.grade} • Approved`
          : `${existing.subject} • ${existing.grade} • Rejected: ${reason}`,
      meta: {
        lessonPlanId: existing.id,
        status: updated.status,
        rejectionReason: updated.rejectionReason || null,
      },
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
