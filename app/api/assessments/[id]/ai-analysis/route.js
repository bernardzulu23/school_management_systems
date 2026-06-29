export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { withAILimits } from '@/lib/middleware/withAILimits'
import { checkAILimit, trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { parseAssessmentInteractive } from '@/lib/assessments/assessmentInteractive'
import { parseInteractiveQuizPayload } from '@/lib/assessments/interactiveQuiz'
import { generateQuizClassAnalysis } from '@/lib/assessments/generateQuizClassAnalysis'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

function parseSubmissionContent(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const POST = withAILimits(
  withErrorHandler(async function POST(request, { params }) {
    const id = await safeRouteParam(params, 'id')
    if (!id) throw new ApiError('Assessment id is required', 400)
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
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

    const interactive = parseAssessmentInteractive(assessment.description)
    const assignmentId = assessment.publishedAssignmentId || interactive?.publishedAssignmentId
    if (!assignmentId) {
      throw new ApiError('Assessment must be published before generating analysis', 400)
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
    })
    if (!assignment) throw new ApiError('Published assignment not found', 404)

    const payload = parseInteractiveQuizPayload(assignment.description)
    const questions = payload?.quiz?.questions || interactive?.questions || []

    const [submissions, classStudents] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { assignmentId: assignment.id, schoolId, status: 'submitted' },
      }),
      assessment.classId
        ? prisma.student.findMany({
            where: { schoolId, classId: assessment.classId },
            select: { id: true },
          })
        : prisma.student.findMany({
            where: { schoolId, class: assessment.class },
            select: { id: true },
          }),
    ])

    const graded = submissions.filter((s) => Number.isFinite(Number(s.grade)))
    const averagePercentage =
      graded.length > 0
        ? Math.round(graded.reduce((sum, s) => sum + Number(s.grade), 0) / graded.length)
        : 0
    const needsSupportCount = graded.filter((s) => Number(s.grade) < 65).length

    const stats = {
      classSize: classStudents.length,
      attempted: submissions.length,
      averagePercentage,
      needsSupportCount,
    }

    const limitBlock = await checkAILimit(schoolId, String(auth.user?.id || ''))
    if (limitBlock) return limitBlock

    const analysis = await generateQuizClassAnalysis({
      assessment,
      stats,
      submissions,
      questions,
    })

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { aiAnalysis: analysis },
    })

    await trackAIUsage(schoolId, 'quiz-class-analysis').catch(() => {})

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  })
)

export const GET = withErrorHandler(async function GET(request, { params }) {
  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Assessment id is required', 400)
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const assessment = await prisma.assessment.findFirst({
    where: { id, schoolId },
    select: { id: true, aiAnalysis: true },
  })
  if (!assessment) throw new ApiError('Assessment not found', 404)

  return NextResponse.json({
    success: true,
    data: assessment.aiAnalysis || null,
  })
})
