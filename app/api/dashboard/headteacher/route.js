import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    // 1. Basic Stats
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      resultsCount
    ] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.result.count()
    ])

    // 2. Attendance (Placeholder until model exists)
    const attendanceRate = 0 // TODO: Implement Attendance model and logic

    // 3. Pass Rate Calculation (from Results)
    const passedResults = await prisma.result.count({
      where: { score: { gte: 50 } }
    })
    const passRate = resultsCount > 0 ? Math.round((passedResults / resultsCount) * 100) : 0

    // 4. Students Requiring Attention (Score < 40)
    const lowPerformingResults = await prisma.result.findMany({
      where: { score: { lt: 40 } },
      include: { student: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    const atRiskMap = new Map()
    lowPerformingResults.forEach(r => {
      if (!atRiskMap.has(r.studentId)) {
        atRiskMap.set(r.studentId, {
          name: r.student.name,
          year: r.student.class,
          failedAssessments: 0,
          lowGrades: 0,
          subjects: new Set(),
          averageScore: r.score, // Simple implementation
          parentContact: r.student.parent_father_contact || r.student.guardian_contact || 'N/A'
        })
      }
      const student = atRiskMap.get(r.studentId)
      student.failedAssessments += 1
      student.lowGrades += 1
      student.subjects.add(r.subject)
    })
    
    const studentsRequiringAttention = Array.from(atRiskMap.values()).map(s => ({
      ...s,
      subjects: Array.from(s.subjects)
    }))

    // 5. Performance Trends
    const performanceTrends = await prisma.result.groupBy({
      by: ['term'],
      _avg: {
        score: true
      }
    })

    // 5a. Performance Summary (for Attention System)
    const criticalRiskCount = studentsRequiringAttention.filter(s => s.averageScore < 30).length
    const highRiskCount = studentsRequiringAttention.filter(s => s.averageScore >= 30 && s.averageScore < 40).length

    const challengingSubjects = await prisma.result.groupBy({
        by: ['subject'],
        _avg: { score: true },
        having: { score: { _avg: { lt: 50 } } },
        take: 3
    })
    
    const strugglingClasses = await prisma.result.groupBy({
        by: ['class'],
        _avg: { score: true },
        having: { score: { _avg: { lt: 50 } } },
        take: 3
    })

    const performanceSummary = {
        students_requiring_attention: studentsRequiringAttention.length,
        critical_risk_students: criticalRiskCount,
        high_risk_students: highRiskCount,
        average_school_performance: passRate,
        subjects_most_challenging: challengingSubjects.map(s => s.subject),
        classes_needing_support: strugglingClasses.map(c => c.class)
    }

    // 5b. Junior Results
    const juniorResults = await prisma.result.findMany({
      where: {
        OR: [
          { class: { startsWith: 'Form 1' } },
          { class: { startsWith: 'Form 2' } }
        ]
      },
      include: { student: true },
      orderBy: { score: 'desc' },
      take: 20
    })

    // 6. Recent Users
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    // 7. Class Stats
    const classes = await prisma.class.findMany()
    const classStats = await Promise.all(classes.map(async (c) => {
      const count = await prisma.student.count({
        where: { class: c.name }
      })
      return {
        name: c.name,
        student_count: count,
        capacity: c.capacity
      }
    }))

    // 8. Monthly Registrations
    const users = await prisma.user.findMany({
      select: { createdAt: true }
    })
    const registrationsMap = {}
    users.forEach(u => {
      const month = u.createdAt.toLocaleString('default', { month: 'short' })
      registrationsMap[month] = (registrationsMap[month] || 0) + 1
    })
    const monthlyRegistrations = Object.entries(registrationsMap).map(([month, count]) => ({
      month,
      count
    }))

    // 9. Teacher Compliance
    const departments = await prisma.teacher.groupBy({
      by: ['department'],
    })
    
    const teacherCompliance = departments.length > 0 ? departments.map(d => ({
        department: d.department || 'Unassigned',
        completion: 85, // Placeholder
        status: 'On Track'
    })) : []

    // 10. Subject Performance
    const subjectPerf = await prisma.result.groupBy({
        by: ['subject'],
        _avg: { score: true },
        take: 5,
        orderBy: { _avg: { score: 'desc' } }
    })

    return NextResponse.json({
      stats: {
        total_students: totalStudents,
        total_teachers: totalTeachers,
        total_classes: totalClasses,
        total_subjects: totalSubjects,
        attendance_rate: attendanceRate,
        pass_rate: passRate,
        teacher_effectiveness: 85, // Placeholder
        compliance_rate: 90, // Placeholder
        teacher_development: 75 // Placeholder
      },
      students_requiring_attention: studentsRequiringAttention,
      performance_trends: performanceTrends,
      performance_summary: performanceSummary, 
      junior_results: juniorResults,
      recent_users: recentUsers.map(u => ({
        ...u,
        status: 'active' 
      })),
      class_stats: classStats,
      monthly_registrations: monthlyRegistrations,
      teacher_compliance: teacherCompliance,
      subject_performance: {
          labels: subjectPerf.map(s => s.subject),
          datasets: [{
              data: subjectPerf.map(s => Math.round(s._avg.score || 0))
          }]
      }
    })

  } catch (error) {
    console.error('Headteacher dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
