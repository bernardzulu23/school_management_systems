import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const schoolId = auth.user?.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 403 })
    }

    // Parallel fetch of counts - scoped by schoolId for multi-tenant isolation
    const [
      totalStudents,
      totalTeachers,
      totalHods,
      totalResults,
      totalClasses,
      totalSubjects,
      totalAssessments,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['student', 'STUDENT'] }, schoolId } }),
      prisma.user.count({ where: { role: { in: ['teacher', 'TEACHER'] }, schoolId } }),
      prisma.user.count({
        where: { role: { in: ['hod', 'HOD', 'head of department'] }, schoolId },
      }),
      prisma.result.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId } }),
      prisma.assessment.count({ where: { schoolId } }),
    ])

    const stats = {
      totalStudents,
      totalTeachers,
      totalHods,
      totalClasses,
      totalSubjects,
      totalAssessments,
    }

    // Calculate additional metrics
    const attendanceRate = 0 // Placeholder: Requires Attendance model

    // Calculate average grade (scoped by schoolId)
    const results = await prisma.result.aggregate({
      where: { schoolId },
      _avg: {
        score: true,
      },
    })
    const averageGrade = results._avg.score ? Math.round(results._avg.score) : 0

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        totalUsers: totalStudents + totalTeachers + totalHods,
        averageAttendance: attendanceRate,
        averageGrade,
        recentActivities: [],
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
