export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { approveAndPublishAssessment, notifyAssessmentReview } from '@/lib/assessments/review'

function normalize(v) {
  return String(v || '').trim()
}

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = normalize(auth.user?.id)
  const id = normalize(routeParams?.id)
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

  const existing = await prisma.assessment.findFirst({
    where: { id, schoolId },
  })
  if (!existing) throw new ApiError('Not found', 404)

  if (String(existing.status) !== 'SUBMITTED') {
    throw new ApiError(`Cannot review assessment with status: ${existing.status}`, 400)
  }

  const isReviewer = String(existing.reviewerUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isReviewer && !isAdmin) throw new ApiError('Forbidden', 403)

  const now = new Date()

  if (action === 'approve') {
    const { assessment, assignment } = await approveAndPublishAssessment({
      assessment: existing,
      schoolId,
      reviewerUserId: userId,
      approvalNotes,
    })

    await notifyAssessmentReview({
      schoolId,
      fromUserId: userId,
      toUserId: existing.createdByUserId,
      assessment,
      title: 'Quiz approved and sent to students',
      message: `${assessment.subject} • ${assessment.class} • Published to class`,
      status: 'PUBLISHED',
    })

    return NextResponse.json({
      success: true,
      data: {
        ...assessment,
        publishedAssignmentId: assignment.id,
      },
    })
  }

  const isRevision = action === 'request_revision' || action === 'revision'
  const next = isRevision
    ? {
        status: 'REVISION_REQUESTED',
        rejectedAt: now,
        approvedAt: null,
        rejectionReason: reason,
        approvalNotes: null,
      }
    : {
        status: 'REJECTED',
        rejectedAt: now,
        approvedAt: null,
        rejectionReason: reason,
        approvalNotes: null,
      }

  const updated = await prisma.assessment.update({
    where: { id: existing.id },
    data: next,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  await notifyAssessmentReview({
    schoolId,
    fromUserId: userId,
    toUserId: existing.createdByUserId,
    assessment: updated,
    title: isRevision ? 'Quiz — revisions requested' : 'Quiz rejected',
    message: `${updated.subject} • ${updated.class} • ${reason}`,
    status: updated.status,
  })

  return NextResponse.json({ success: true, data: updated })
})
