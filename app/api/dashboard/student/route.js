import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// Helper to get current user from session/token (simplified for now)
// In a real app, use your auth library (e.g. next-auth, iron-session)
async function getCurrentUser() {
  // TODO: Implement actual auth check
  // For now, we'll try to find a test student or return unauthorized
  // This is a placeholder. In production, use req.user from middleware.
  
  // Checking for a specific header or cookie would be better
  return null
}

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || 'term'
    
    // Calculate start date based on timeRange
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
        startDate.setMonth(now.getMonth() - 3) // Approx 3 months per term
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 3) // Default to term
    }

    const headersList = headers()
    const userId = headersList.get('x-user-id') // Assuming middleware sets this or we parse token
    
    // Fallback: fetch the first student for dev/demo purposes if no auth
    // In production, this MUST be strict.
    let student = null
    
    // Try to find the student profile associated with the current user
    // If we had the user ID from the session:
    // const user = await prisma.user.findUnique({ where: { id: userId }, include: { studentProfile: true } })
    
    // For this specific codebase, let's assume we can get the logged-in user's email/id from the request
    // or we fetch the first available student for demonstration if not strictly authenticated
    
    // TEMPORARY: Get the first student to populate the dashboard
    const firstStudent = await prisma.student.findFirst({
      include: {
        user: true,
        results: true,
        gamificationProfile: true
      }
    })

    if (!firstStudent) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    student = firstStudent

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

    // 3. Fetch Upcoming Assessments
    // Find assessments for the student's class and subjects
    const upcomingAssessments = await prisma.assessment.findMany({
      where: {
        class: student.class,
        subject: { in: student.selected_subjects },
        date: { gte: new Date() } // Future dates only
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
    
    // 5. Fetch Assignments and calculate statuses
    const rawAssignments = await prisma.assignment.findMany({
      where: { 
        class: student.class,
        subject: { in: student.selected_subjects }
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
