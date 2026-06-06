export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseAssessmentInteractive } from '@/lib/assessments/assessmentInteractive'
import {
  ASSESSMENT_SUBMITTABLE,
  notifyAssessmentReview,
  resolveAssessmentReviewer,
} from '@/lib/assessments/review'
import { isIndividualSchool } from '@/lib/middleware/individual-gate'

function normalize(v) {
  return String(v || '').trim()
}

export const POST = withErrorHandler(async function POST(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = normalize(auth.user?.id)
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = normalize(routeParams?.id)
  const body = await request.json().catch(() => ({}))
  const topic = body?.topic != null ? normalize(body.topic) : null

  const assessment = await prisma.assessment.findFirst({
    where: { id, schoolId },
  })
  if (!assessment) throw new ApiError('Assessment not found', 404)

  const isOwner = !assessment.createdByUserId || String(assessment.createdByUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isOwner && !isAdmin) throw new ApiError('Forbidden', 403)

  if (!ASSESSMENT_SUBMITTABLE.has(String(assessment.status))) {
    throw new ApiError(`Cannot submit assessment with status: ${assessment.status}`, 400)
  }

  const interactive = parseAssessmentInteractive(assessment.description)
  if (!interactive?.questions?.length) {
    throw new ApiError('Add at least one question before submitting to HOD', 400)
  }

  const individual = await isIndividualSchool(schoolId)

  if (individual) {
    const now = new Date()
    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'APPROVED',
        reviewerUserId: null,
        submittedAt: now,
        approvedAt: now,
        rejectedAt: null,
        rejectionReason: null,
        approvalNotes: null,
        ...(topic ? { topic } : {}),
        ...(assessment.createdByUserId ? {} : { createdByUserId: userId }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Assessment approved (solo workspace)',
    })
  }

  const reviewerUserId = await resolveAssessmentReviewer({
    schoolId,
    teacherUserId: userId,
    assessment,
  })
  if (!reviewerUserId) {
    throw new ApiError('No HOD reviewer found for your department. Contact your headteacher.', 400)
  }

  const now = new Date()
  const updated = await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      status: 'SUBMITTED',
      reviewerUserId,
      submittedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      approvedAt: null,
      approvalNotes: null,
      ...(topic ? { topic } : {}),
      ...(assessment.createdByUserId ? {} : { createdByUserId: userId }),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  await notifyAssessmentReview({
    schoolId,
    fromUserId: userId,
    toUserId: reviewerUserId,
    assessment: updated,
    title: 'Quiz submitted for review',
    message: `${updated.subject} • ${updated.class} • ${updated.title}`,
    status: 'SUBMITTED',
  })

  return NextResponse.json({ success: true, data: updated })
})
