import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    // Parallel fetch of counts
    const [
      totalStudents,
      totalTeachers,
      totalHods,
      totalResults,
      totalClasses,
      totalSubjects,
      totalAssessments
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'teacher' } }),
      prisma.user.count({ where: { role: 'hod' } }),
      prisma.result.count(),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.assessment.count()
    ])

    const stats = {
      totalStudents,
      totalTeachers,
      totalHods,
      totalClasses,
      totalSubjects,
      totalAssessments
    }

    // Calculate additional metrics
    const attendanceRate = 0 // Placeholder: Requires Attendance model
    
    // Calculate average grade
    const results = await prisma.result.aggregate({
      _avg: {
        score: true
      }
    })
    const averageGrade = results._avg.score ? Math.round(results._avg.score) : 0

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        attendanceRate,
        averageGrade,
        recentActivities: [] 
      }
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
