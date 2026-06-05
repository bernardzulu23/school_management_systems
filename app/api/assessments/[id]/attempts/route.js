export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseAssessmentInteractive } from '@/lib/assessments/assessmentInteractive'
import { parseInteractiveQuizPayload } from '@/lib/assessments/interactiveQuiz'

function parseSubmissionContent(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
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
    where: { id: routeParams.id, schoolId },
  })
  if (!assessment) throw new ApiError('Assessment not found', 404)

  const interactive = parseAssessmentInteractive(assessment.description)
  const publishedAssignmentId =
    assessment.publishedAssignmentId || interactive?.publishedAssignmentId

  if (!publishedAssignmentId) {
    return NextResponse.json({
      success: true,
      data: {
        published: false,
        assessmentId: assessment.id,
        title: assessment.title,
        message: 'Publish this assessment to students to track attempts.',
      },
    })
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: publishedAssignmentId, schoolId },
  })
  if (!assignment) {
    return NextResponse.json({
      success: true,
      data: {
        published: false,
        assessmentId: assessment.id,
        title: assessment.title,
        message: 'Published assignment not found. Re-publish if needed.',
      },
    })
  }

  const payload = parseInteractiveQuizPayload(assignment.description)
  const questionCount = payload?.quiz?.questions?.length || 0

  const [submissions, classStudents] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id, schoolId },
      include: {
        student: {
          select: { id: true, name: true, class: true, exam_number: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    assessment.classId
      ? prisma.student.findMany({
          where: { schoolId, classId: assessment.classId },
          select: { id: true, name: true, class: true, exam_number: true },
          orderBy: { name: 'asc' },
        })
      : prisma.student.findMany({
          where: { schoolId, class: assessment.class },
          select: { id: true, name: true, class: true, exam_number: true },
          orderBy: { name: 'asc' },
        }),
  ])

  const attemptedIds = new Set(submissions.map((s) => String(s.studentId)))
  const notAttempted = classStudents.filter((s) => !attemptedIds.has(String(s.id)))

  const mappedSubmissions = submissions.map((s) => {
    const content = parseSubmissionContent(s.content)
    const percentage = Number.isFinite(Number(s.grade)) ? Math.round(Number(s.grade)) : null
    return {
      id: s.id,
      studentId: s.studentId,
      studentName: s.student?.name || 'Unknown',
      class: s.student?.class || null,
      examNumber: s.student?.exam_number || null,
      status: s.status,
      submittedAt: s.submittedAt,
      percentage,
      score: content?.score ?? null,
      totalMarks: content?.totalMarks ?? questionCount,
      encouragement: content?.encouragement || s.feedback || '',
      needsSupport: percentage != null && percentage < 65,
      needsReview: Boolean(content?.needsReview),
      review: Array.isArray(content?.review) ? content.review : [],
    }
  })

  const graded = mappedSubmissions.filter((s) => s.percentage != null)
  const averagePercentage =
    graded.length > 0
      ? Math.round(graded.reduce((sum, s) => sum + s.percentage, 0) / graded.length)
      : 0
  const needsSupport = mappedSubmissions.filter((s) => s.needsSupport)

  return NextResponse.json({
    success: true,
    data: {
      published: true,
      assessmentId: assessment.id,
      assignmentId: assignment.id,
      title: assessment.title,
      subject: assessment.subject,
      class: assessment.class,
      topic: assessment.topic,
      status: assessment.status,
      questionCount,
      stats: {
        classSize: classStudents.length,
        attempted: mappedSubmissions.length,
        notAttempted: notAttempted.length,
        averagePercentage,
        needsSupportCount: needsSupport.length,
      },
      submissions: mappedSubmissions,
      notAttempted: notAttempted.map((s) => ({
        studentId: s.id,
        name: s.name,
        class: s.class,
        examNumber: s.exam_number,
      })),
      needsSupport,
    },
  })
})
