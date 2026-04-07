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
      totalUsers,
      totalStudents,
      totalTeachers,
      totalHods,
      totalHeadteachers,
      totalResults,
      totalClasses,
      totalSubjects,
      totalAssessments,
    ] = await Promise.all([
      prisma.user.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.headOfDepartment.count({ where: { schoolId } }),
      prisma.user.count({
        where: { role: { in: ['headteacher', 'HEADTEACHER', 'admin', 'administrator'] }, schoolId },
      }),
      prisma.result.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId } }),
      prisma.assessment.count({ where: { schoolId } }),
    ])

    // Calculate attendance metrics
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    const [todayAttendanceCount, presentCount] = await Promise.all([
      prisma.attendance.count({
        where: { schoolId, date: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.attendance.count({
        where: { schoolId, date: { gte: startOfDay, lte: endOfDay }, status: 'present' },
      }),
    ])

    const attendanceRate =
      todayAttendanceCount > 0 ? Math.round((presentCount / todayAttendanceCount) * 100) : 0

    const stats = {
      totalStudents,
      totalTeachers,
      totalHods,
      totalHeadteachers,
      totalClasses,
      totalSubjects,
      totalAssessments,
    }

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
        totalUsers,
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
