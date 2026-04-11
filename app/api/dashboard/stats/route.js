import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
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

    const recentResults = await prisma.result.findMany({
      where: { schoolId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        score: true,
        grade: true,
        term: true,
        year: true,
        enteredByUserId: true,
        student: { select: { name: true, class: true } },
        subject: { select: { name: true } },
      },
      take: 20,
    })

    const enteredByIds = Array.from(
      new Set(recentResults.map((r) => String(r.enteredByUserId || '')).filter(Boolean))
    )
    const enteredByUsers = enteredByIds.length
      ? await prisma.user.findMany({
          where: { id: { in: enteredByIds } },
          select: { id: true, name: true },
          take: 2000,
        })
      : []
    const userNameById = new Map(enteredByUsers.map((u) => [String(u.id), u.name]))

    const recentActivities = recentResults.map((r) => ({
      id: r.id,
      type: 'result',
      createdAt: r.updatedAt || r.createdAt,
      title: `${r.subject?.name || 'Subject'} result entered`,
      description: `${r.student?.name || 'Student'} • ${r.student?.class || ''} • ${Math.round(
        Number(r.score || 0)
      )}%`,
      actor: userNameById.get(String(r.enteredByUserId || '')) || 'Unknown',
      class_name: r.student?.class || '',
      subject_name: r.subject?.name || '',
      term: r.term,
      year: r.year,
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        totalUsers,
        averageAttendance: attendanceRate,
        averageGrade,
        totalResults,
        recentActivities,
        recent_activities: recentActivities.map((a) => ({
          ...a,
          created_at: a.createdAt,
        })),
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
