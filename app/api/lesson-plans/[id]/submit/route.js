import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { resolveReviewerUserId } from '@/lib/lesson-plans/reviewer'
import { sanitizeText } from '@/lib/lesson-plans/text'
import { isIndividualSchool } from '@/lib/middleware/individual-gate'
import { syncTaughtProgressFromLessonPlan } from '@/lib/teaching/syncTaughtProgressFromLessonPlan'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

const SUBMITTABLE = new Set(['DRAFT', 'REJECTED', 'REVISION_REQUESTED'])

export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const body = await request.json().catch(() => ({}))
  const content = body?.content != null ? sanitizeText(String(body.content)) : null

  const existing = await prisma.lessonPlan.findFirst({
    where: { id, schoolId },
  })
  if (!existing) throw new ApiError('Not found', 404)

  const isOwner = String(existing.createdByUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isOwner && !isAdmin) throw new ApiError('Forbidden', 403)

  if (!SUBMITTABLE.has(String(existing.status))) {
    throw new ApiError(`Cannot submit lesson plan with status: ${existing.status}`, 400)
  }

  const individual = await isIndividualSchool(schoolId)

  if (individual) {
    const now = new Date()
    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewerUserId: null,
        submittedAt: now,
        approvedAt: now,
        rejectedAt: null,
        rejectionReason: null,
        ...(content != null ? { content } : {}),
        version: { increment: 1 },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })
    try {
      await syncTaughtProgressFromLessonPlan({ lessonPlanId: updated.id, taught: true })
    } catch (err) {
      console.warn('[teaching] taught-progress sync failed:', err?.message || err)
    }
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Lesson plan approved (solo workspace)',
    })
  }

  const reviewerUserId = await resolveReviewerUserId({
    schoolId,
    teacherUserId: userId,
    grade: existing.grade,
    subject: existing.subject,
  })
  if (!reviewerUserId) {
    throw new ApiError(
      'No reviewer found. Secondary: assign an HOD. Primary: assign a senior teacher, deputy, or headteacher.',
      400
    )
  }

  const now = new Date()
  const updated = await prisma.lessonPlan.update({
    where: { id },
    data: {
      status: 'SUBMITTED',
      reviewerUserId,
      submittedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      approvedAt: null,
      approvalNotes: null,
      ...(content != null ? { content } : {}),
      version: { increment: 1 },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  await prisma.timetableNotification.create({
    data: {
      schoolId,
      fromUserId: userId,
      toUserId: reviewerUserId,
      type: 'lesson_plan',
      title: 'Lesson Plan Pending Approval',
      message: `${updated.subject} • ${updated.grade} • ${updated.topic}`,
      meta: { lessonPlanId: updated.id, status: 'SUBMITTED' },
    },
  })

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Submitted to ${updated.reviewer?.name || 'HOD'} for approval`,
  })
})
