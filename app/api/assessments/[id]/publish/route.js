export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  parseAssessmentInteractive,
  publishAssessmentAsAssignment,
} from '@/lib/assessments/assessmentInteractive'

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

  const assessment = await prisma.assessment.findFirst({
    where: { id: routeParams.id, schoolId },
  })
  if (!assessment) throw new ApiError('Assessment not found', 404)

  const body = await request.json().catch(() => ({}))
  const stored = parseAssessmentInteractive(assessment.description)
  const questions = Array.isArray(body.questions) ? body.questions : stored?.questions || []

  if (!questions.length) {
    throw new ApiError('Add questions before publishing to students', 400)
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })

  const classId = body.classId || assessment.classId
  const className = body.class || assessment.class
  const dueDate = body.dueDate ? new Date(body.dueDate) : assessment.date

  const { assignment } = await publishAssessmentAsAssignment({
    prisma,
    schoolId,
    assessment,
    questions,
    classId,
    className,
    dueDate,
    teacherId: teacher?.id,
  })

  return NextResponse.json({
    success: true,
    data: {
      assessmentId: assessment.id,
      publishedAssignmentId: assignment.id,
      message: 'Published to students — answers hidden until they select an option',
    },
  })
})
