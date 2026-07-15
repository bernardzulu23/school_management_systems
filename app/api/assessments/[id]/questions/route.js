export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  buildAssessmentInteractiveDescription,
  parseAssessmentInteractive,
} from '@/lib/assessments/assessmentInteractive'
import { ASSESSMENT_EDITABLE } from '@/lib/assessments/review'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Assessment id is required', 400)
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const assessment = await prisma.assessment.findFirst({
    where: { id, schoolId },
  })
  if (!assessment) throw new ApiError('Assessment not found', 404)

  const interactive = parseAssessmentInteractive(assessment.description)

  return NextResponse.json({
    success: true,
    data: {
      assessmentId: assessment.id,
      title: assessment.title,
      subject: assessment.subject,
      class: assessment.class,
      topic: assessment.topic,
      status: assessment.status,
      questions: interactive?.questions || [],
      publishedAssignmentId:
        assessment.publishedAssignmentId || interactive?.publishedAssignmentId || null,
      publishedAt: interactive?.publishedAt || null,
      submittedAt: assessment.submittedAt,
      approvedAt: assessment.approvedAt,
      rejectionReason: assessment.rejectionReason,
      approvalNotes: assessment.approvalNotes,
      aiAnalysis: assessment.aiAnalysis,
    },
  })
})

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Assessment id is required', 400)
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const assessment = await prisma.assessment.findFirst({
    where: { id, schoolId },
  })
  if (!assessment) throw new ApiError('Assessment not found', 404)

  if (!ASSESSMENT_EDITABLE.has(String(assessment.status))) {
    throw new ApiError(`Cannot edit questions while status is ${assessment.status}`, 400)
  }

  const body = await request.json().catch(() => ({}))
  const questions = Array.isArray(body.questions) ? body.questions : []
  const existing = parseAssessmentInteractive(assessment.description)

  const updateResult = await prisma.assessment.updateMany({
    where: { id: assessment.id, schoolId },
    data: {
      description: buildAssessmentInteractiveDescription({
        questions,
        publishedAssignmentId: existing?.publishedAssignmentId || null,
        publishedAt: existing?.publishedAt || null,
      }),
    },
  })
  if (updateResult.count === 0) throw new ApiError('Assessment not found', 404)

  return NextResponse.json({
    success: true,
    data: { assessmentId: assessment.id, questionCount: questions.length },
  })
})
