import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { headers } from 'next/headers'

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

    // 4. Performance Data (Last 5 results)
    const recentResults = await prisma.result.findMany({
      where: { studentId: student.id },
      include: { subject: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // 5. Fetch Goals
    const goals = await prisma.goal.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // 5b. Fetch Study Materials (New)
    const studyMaterials = await prisma.studyMaterial.findMany({
      take: 5,
      orderBy: { uploadDate: 'desc' },
      // In a real app, filter by student's subjects
      where: {
        subject: { in: student.selected_subjects }
      }
    })

    // 5c. Fetch Games (New)
    const games = await prisma.game.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
      // Could filter by subject or difficulty if needed
    })

    const gamesPlayedCount = await prisma.studentGame.count({
      where: { studentId: student.id }
    })
    
    const achievementsCount = await prisma.studentBadge.count({
      where: { studentId: student.id }
    })

    const achievementsList = await prisma.studentBadge.findMany({
      where: { studentId: student.id },
      include: { badge: true },
      take: 10,
      orderBy: { awardedAt: 'desc' }
    })

    const totalGoals = await prisma.goal.count({
      where: { studentId: student.id }
    })

    const completedGoals = await prisma.goal.count({
      where: { 
        studentId: student.id,
        status: 'completed'
      }
    })

    // 5d. Fetch Attendance & Assignments (Graceful)
    let attendanceRate = 0
    try {
      if (prisma.attendance) {
        const attendanceRecords = await prisma.attendance.findMany({
          where: { studentId: student.id }
        })
        if (attendanceRecords.length > 0) {
          const presentCount = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length
          attendanceRate = Math.round((presentCount / attendanceRecords.length) * 100)
        }
      }
    } catch (e) {
      console.warn('Attendance fetch failed:', e.message)
    }

    let assignmentsCompleted = 0
    let totalAssignments = 0
    try {
      if (prisma.assignment && prisma.assignmentSubmission) {
        const assignments = await prisma.assignment.findMany({
          where: { 
            class: student.class,
            subject: { in: student.selected_subjects }
          }
        })
        totalAssignments = assignments.length

        const submissions = await prisma.assignmentSubmission.findMany({
          where: { studentId: student.id }
        })
        assignmentsCompleted = submissions.length
      }
    } catch (e) {
      console.warn('Assignment fetch failed:', e.message)
    }

    // 6. Enrolled Subjects Data
    const subjectsData = await prisma.subject.findMany({
      where: {
        name: { in: student.selected_subjects }
      },
      include: {
        teacher: {
          include: { user: true }
        },
        results: {
          where: { studentId: student.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    // Helper to calculate grade letter
    const getGradeLetter = (score) => {
      if (!score && score !== 0) return 'N/A'
      if (score >= 75) return 'A+'
      if (score >= 70) return 'A'
      if (score >= 60) return 'B'
      if (score >= 50) return 'C'
      if (score >= 40) return 'D'
      return 'F'
    }

    const enrolled_subjects = await Promise.all(subjectsData.map(async subject => {
      const recentGrades = subject.results.map(r => r.score)
      const currentGrade = recentGrades.length > 0 
        ? Math.round(recentGrades.reduce((a, b) => a + b, 0) / recentGrades.length) 
        : 0

      const nextAssessment = upcomingAssessments.find(a => a.subject === subject.name)
      
      let subjectAssignments = 0
      let subjectCompleted = 0
      
      try {
        if (prisma.assignment && prisma.assignmentSubmission) {
           subjectAssignments = await prisma.assignment.count({
               where: { subject: subject.name, class: student.class }
           })
           subjectCompleted = await prisma.assignmentSubmission.count({
               where: { 
                   studentId: student.id,
                   assignment: { subject: subject.name }
               }
           })
        }
      } catch (e) {}

      return {
        id: subject.id,
        name: subject.name,
        // Frontend compatibility aliases
        subject: subject.name,
        avgScore: currentGrade,
        latestGrade: getGradeLetter(currentGrade),
        assessments: subjectAssignments,
        
        code: subject.code || `${subject.name.substring(0, 3).toUpperCase()}101`,
        teacher: subject.teacher?.user?.name || 'TBA',
        currentGrade: currentGrade,
        percentage: currentGrade,
        trend: recentGrades.length >= 2 ? (recentGrades[0] > recentGrades[1] ? 'improving' : 'declining') : 'stable',
        assignments: subjectAssignments, 
        completedAssignments: subjectCompleted, 
        nextAssessment: nextAssessment ? nextAssessment.date : null,
        recentGrades: recentGrades,
        topics: subject.topics || [], // Dynamic topics from DB
        attendance: attendanceRate, // Use global rate as proxy for subject attendance for now
        status: currentGrade >= 80 ? 'excellent' : currentGrade >= 60 ? 'good' : 'needs improvement'
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        student: {
          name: student.name,
          email: student.user?.email,
          class: student.class,
          examNumber: student.exam_number,
          subjects: student.selected_subjects,
          emergency_contact: {
            name: student.emergency_contact_name || 'Not provided',
            relationship: student.emergency_contact_relationship || 'Not provided',
            phone: student.emergency_contact_phone || 'Not provided',
            address: student.emergency_contact_address || 'Not provided'
          }
        },
        stats: {
          attendance_rate: attendanceRate,
          average_grade: averageGrade,
          assignments_completed: assignmentsCompleted,
          total_assignments: totalAssignments,
          gamesPlayed: gamesPlayedCount,
          achievements: achievementsCount,
          level: student.gamificationProfile?.level || 1,
          points: student.gamificationProfile?.points || 0,
          totalSubjects,
          totalResults,
          completedGoals,
          totalGoals,
          recentMaterials: studyMaterials.length
        },
        achievements_list: achievementsList.map(a => ({
          id: a.badge.id,
          name: a.badge.name,
          description: a.badge.description,
          icon: a.badge.icon,
          category: a.badge.category,
          awardedAt: a.awardedAt
        })),
        goals: goals.map(g => ({
          id: g.id,
          title: g.title,
          progress: g.progress,
          status: g.status
        })),
        my_class: myClass ? {
          id: myClass.id,
          name: myClass.name,
          academic_year: new Date().getFullYear().toString(),
          level: myClass.level, 
          stream: myClass.section 
        } : null,
        recent_results: recentResults,
        upcoming_assessments: upcomingAssessments.map(a => ({
          id: a.id,
          title: a.title,
          subject: a.subject,
          type: a.type,
          start_date: a.date,
          duration_minutes: a.duration_minutes || 60
        })),
        study_materials: studyMaterials.map(m => ({
          id: m.id,
          title: m.title,
          subject: m.subject,
          type: m.type,
          fileSize: m.size || 'N/A',
          fileUrl: m.fileUrl
        })),
        games: games.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          type: g.type,
          subject: g.subject,
          content: g.content
        })),
        enrolled_subjects,
        subject_performance: enrolled_subjects // Alias for frontend compatibility
      }
    })

  } catch (error) {
    console.error('Student dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student dashboard data' },
      { status: 500 }
    )
  }
}
