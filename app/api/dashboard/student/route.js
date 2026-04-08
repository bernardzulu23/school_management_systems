import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden: Student access only' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || 'term'

    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'term':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 3)
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      include: {
        user: true,
        gamificationProfile: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    const enrollments = await prisma.pupilSubjectEnrollment.findMany({
      where: { schoolId, pupilId: student.id },
      include: {
        subject: {
          include: {
            teacher: { include: { user: true } },
          },
        },
      },
    })

    const subjectNames = Array.from(
      new Set(
        enrollments
          .map((e) => e?.subject?.name)
          .filter(Boolean)
          .map(String)
      )
    )

    const allResults = await prisma.result.findMany({
      where: { schoolId, studentId: student.id },
      include: { subject: { include: { teacher: { include: { user: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // 1. Calculate Stats
    const totalSubjects = subjectNames.length
    const totalResults = allResults.length

    // Calculate Average Grade
    let averageGrade = 0
    if (totalResults > 0) {
      const totalScore = allResults.reduce((acc, curr) => acc + (curr.score || 0), 0)
      averageGrade = totalScore / totalResults
    }

    // 2. Fetch Class Info
    let myClass = null
    if (student.class) {
      myClass = await prisma.class.findFirst({
        where: { schoolId, name: student.class },
      })
    }

    // 3. Fetch Upcoming Assessments (scoped by schoolId)
    const upcomingAssessments = await prisma.assessment.findMany({
      where: {
        schoolId,
        class: student.class,
        subject: { in: subjectNames },
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 5,
    })

    // 4. Fetch Recent Results (with filtering)
    const recentResults = allResults.slice(0, 10)

    // 5. Fetch Assignments and calculate statuses (scoped by schoolId)
    const rawAssignments = await prisma.assignment.findMany({
      where: {
        schoolId,
        class: student.class,
        subject: { in: subjectNames },
      },
      include: {
        submissions: {
          where: { studentId: student.id },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    // Process assignments to determine status
    const assignmentsList = rawAssignments.map((assignment) => {
      const submission = assignment.submissions[0]
      let status = 'pending'

      const dueDate = new Date(assignment.dueDate)
      const isPastDue = dueDate < now

      if (submission) {
        const submittedAt = new Date(submission.submittedAt)
        if (submission.status === 'late' || submittedAt > dueDate) {
          status = 'late'
        } else {
          status = 'completed'
        }
      } else if (isPastDue) {
        status = 'missing'
      }

      return {
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject,
        dueDate: assignment.dueDate,
        createdAt: assignment.createdAt,
        status: status,
        grade: submission?.grade,
        feedback: submission?.feedback,
      }
    })

    // 6. Fetch Attendance
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        schoolId,
        studentId: student.id,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    })

    // 7. Calculate Attendance Percentage
    let attendancePercentage = 100
    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter((r) => r.status === 'present').length
      attendancePercentage = (presentCount / attendanceRecords.length) * 100
    }

    // 8. Construct Enrolled Subjects & Performance Data
    // We need to map student.selected_subjects to rich objects
    // Since we store subjects as strings in selected_subjects, we try to find Subject records if they exist, or mock defaults

    const enrolledSubjects = enrollments
      .filter((e) => e?.subject?.name)
      .map((e) => {
        const subjectName = String(e.subject.name)
        const subjectId = e.subject.id
        const teacherName = e.subject?.teacher?.user?.name || 'Not Assigned'

        const subjectResults = allResults.filter(
          (r) => r.subjectId === subjectId || r.subject?.name === subjectName
        )
        let currentGrade = 0
        if (subjectResults.length > 0) {
          currentGrade =
            subjectResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / subjectResults.length
        }

        let status = 'good'
        if (currentGrade >= 80) status = 'excellent'
        else if (currentGrade < 50) status = 'needs-improvement'

        return {
          id: subjectId,
          name: subjectName,
          teacher: teacherName,
          status,
          trend: 'stable',
          currentGrade: Math.round(currentGrade),
          assignments: rawAssignments.filter((a) => a.subject === subjectName).length,
          completedAssignments: assignmentsList.filter(
            (a) => a.subject === subjectName && a.status === 'completed'
          ).length,
          attendance: Math.round(attendancePercentage),
        }
      })

    // Subject Performance (for the "My Subjects" card)
    const subjectPerformance = enrolledSubjects.map((sub) => ({
      subject: sub.name,
      teacher: sub.teacher,
      avgScore: sub.currentGrade,
      assessments: rawAssignments.filter((a) => a.subject === sub.name).length,
      latestGrade:
        sub.currentGrade >= 75
          ? 'A'
          : sub.currentGrade >= 60
            ? 'B'
            : sub.currentGrade >= 50
              ? 'C'
              : 'F',
    }))

    // Construct Dashboard Data Response
    const dashboardData = {
      stats: {
        totalSubjects: totalSubjects,
        totalResults: totalResults,
        averageGrade: Math.round(averageGrade),
        completedGoals: 0, // Placeholder
        totalGoals: 0, // Placeholder
        recentMaterials: 0, // Placeholder
        gamesPlayed: 0,
        achievements: 0,
        level: 1,
        points: 0,
        attendanceRate: `${Math.round(attendancePercentage)}%`,
      },
      student: {
        id: student.id,
        name: student.name,
        class: student.class,
        exam_number: student.exam_number,
        average_grade: Math.round(averageGrade),
        attendance_percentage: Math.round(attendancePercentage),
        total_subjects: subjectNames.length,
        assignments_pending: assignmentsList.filter((a) => a.status === 'pending').length,
        assignments_list: assignmentsList,
        attendance_records: attendanceRecords,
        gamification: student.gamificationProfile,
        subjects: subjectNames,
      },
      enrolled_subjects: enrolledSubjects,
      subject_performance: subjectPerformance,
      upcoming_assessments: upcomingAssessments,
      recent_results: recentResults,
      class_info: myClass,
    }

    return NextResponse.json({ data: dashboardData })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
