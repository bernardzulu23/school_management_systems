import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

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

    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id },
      include: {
        user: true,
        results: true,
        gamificationProfile: true
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // 1. Calculate Stats
    const totalSubjects = student.selected_subjects.length
    const totalResults = student.results.length
    
    // Calculate Average Grade
    let averageGrade = 0
    if (totalResults > 0) {
      const totalScore = student.results.reduce((acc, curr) => acc + (curr.score || 0), 0)
      averageGrade = totalScore / totalResults
    }

    // 2. Fetch Class Info
    let myClass = null
    if (student.class) {
      myClass = await prisma.class.findFirst({
        where: { name: student.class }
      })
    }

    // 3. Fetch Upcoming Assessments (scoped by schoolId)
    const upcomingAssessments = await prisma.assessment.findMany({
      where: {
        schoolId: student.schoolId,
        class: student.class,
        subject: { in: student.selected_subjects || [] },
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' },
      take: 5
    })

    // 4. Fetch Recent Results (with filtering)
    const recentResults = await prisma.result.findMany({
      where: {
        studentId: student.id,
        // Filter by date if applicable, or just take latest
        // For simplicity, we just take the latest ones
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    // 5. Fetch Assignments and calculate statuses (scoped by schoolId)
    const rawAssignments = await prisma.assignment.findMany({
      where: { 
        schoolId: student.schoolId,
        class: student.class,
        subject: { in: student.selected_subjects || [] }
      },
      include: {
        submissions: {
          where: { studentId: student.id }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    // Process assignments to determine status (completed, late, missing, pending)
    const assignmentsList = rawAssignments.map(assignment => {
      const submission = assignment.submissions[0]
      let status = 'pending'
      
      const dueDate = new Date(assignment.dueDate)
      const isPastDue = dueDate < now
      
      if (submission) {
        const submittedAt = new Date(submission.submittedAt)
        if (submission.status === 'late' || (submittedAt > dueDate)) {
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
        feedback: submission?.feedback
      }
    })

    // 6. Fetch Attendance
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    })

    // 7. Calculate Attendance Percentage
    // This depends on how many days/classes there were. 
    // Simplified: (Present / Total Records) * 100
    // Real world: (Present / Total School Days) * 100
    let attendancePercentage = 100
    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter(r => r.status === 'present').length
      attendancePercentage = (presentCount / attendanceRecords.length) * 100
    }

    // Construct Dashboard Data Response
    const dashboardData = {
      student: {
        id: student.id,
        name: student.name,
        class: student.class,
        average_grade: Math.round(averageGrade),
        attendance_percentage: Math.round(attendancePercentage),
        total_subjects: totalSubjects,
        assignments_pending: assignmentsList.filter(a => a.status === 'pending').length,
        assignments_list: assignmentsList,
        attendance_records: attendanceRecords,
        gamification: student.gamificationProfile
      },
      upcoming_assessments: upcomingAssessments,
      recent_results: recentResults,
      class_info: myClass
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
