export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function avg(values) {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const classId = String(searchParams.get('classId') || '').trim()
  const subjectId = String(searchParams.get('subjectId') || '').trim()

  if (!classId || !subjectId) {
    throw new ApiError('classId and subjectId are required', 400)
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!teacher && roleCheck(auth.user, ['TEACHER', 'teacher'])) {
    throw new ApiError('Teacher profile not found', 404)
  }

  const assignment = teacher
    ? await prisma.teachingAssignment.findFirst({
        where: { schoolId, teacherId: teacher.id, classId, subjectId },
        select: { id: true },
      })
    : null

  if (teacher && !assignment) {
    throw new ApiError('No teaching assignment for this class and subject', 403)
  }

  const [classRecord, subjectRecord] = await Promise.all([
    prisma.class.findFirst({ where: { schoolId, id: classId }, select: { id: true, name: true } }),
    prisma.subject.findFirst({
      where: { schoolId, id: subjectId },
      select: { id: true, name: true },
    }),
  ])

  if (!classRecord) throw new ApiError('Class not found', 404)
  if (!subjectRecord) throw new ApiError('Subject not found', 404)

  const now = new Date()
  const assessments = await prisma.assessment.findMany({
    where: { schoolId, class: classRecord.name, subject: subjectRecord.name },
    orderBy: { date: 'desc' },
    take: 50,
  })

  const completedAssessments = assessments.filter((a) => new Date(a.date) < now).length
  const upcomingAssessments = assessments.filter((a) => new Date(a.date) >= now).length

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, classId, subjectId },
    select: { pupilId: true },
    distinct: ['pupilId'],
    take: 20000,
  })

  let studentIds = enrollments.map((e) => String(e.pupilId)).filter(Boolean)

  if (studentIds.length === 0) {
    const fallbackStudents = await prisma.student.findMany({
      where: {
        schoolId,
        OR: [{ class: classRecord.name }, { class: classRecord.id }],
        selected_subjects: { hasSome: [subjectRecord.name, subjectRecord.id] },
      },
      select: { id: true },
      take: 20000,
    })
    studentIds = fallbackStudents.map((s) => String(s.id))
  }

  const results =
    studentIds.length > 0
      ? await prisma.result.findMany({
          where: {
            schoolId,
            subjectId,
            studentId: { in: studentIds },
            ...(teacher ? { enteredByUserId: auth.user.id } : {}),
          },
          select: { studentId: true, score: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 50000,
        })
      : []

  const scores = results.map((r) => Number(r.score || 0))
  const averageScore = Math.round(avg(scores))
  const passRate = scores.length
    ? Math.round((scores.filter((s) => s >= 50).length / scores.length) * 100)
    : 0
  const studentsAssessed = new Set(results.map((r) => String(r.studentId))).size

  const recentActivity = []
  const recentAssessments = assessments.slice(0, 3)
  for (const a of recentAssessments) {
    const when = new Date(a.date)
    recentActivity.push({
      id: `assessment-${a.id}`,
      type: when < now ? 'completed' : 'scheduled',
      title: when < now ? 'Assessment Completed' : 'Assessment Scheduled',
      description: `${a.title} • ${subjectRecord.name}`,
      time: when.toISOString(),
    })
  }

  const latestResult = results[0]
  if (latestResult?.updatedAt) {
    recentActivity.unshift({
      id: 'results-uploaded',
      type: 'saved',
      title: 'Results Updated',
      description: `${subjectRecord.name} • ${classRecord.name}`,
      time: new Date(latestResult.updatedAt).toISOString(),
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      totalAssessments: assessments.length,
      completedAssessments,
      upcomingAssessments,
      studentsAssessed,
      averageScore,
      passRate,
      recentActivity,
    },
  })
})
