import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export const dynamic = 'force-dynamic'

function isMissingTableError(error) {
  const raw = String(error?.message || '')
  const code = String(error?.code || '')
  return code === 'P2021' || code === 'P2022' || raw.includes('P2021') || raw.includes('P2022')
}

function isDbUnreachableError(error) {
  const raw = String(error?.message || '')
  const code = String(error?.code || '')
  const name = String(error?.name || '')
  return (
    code === 'P1001' ||
    raw.includes('P1001') ||
    raw.toLowerCase().includes("can't reach database server") ||
    code === 'DriverAdapterError' ||
    name === 'DriverAdapterError' ||
    raw.includes('DriverAdapterError')
  )
}

export async function GET(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 403 })
    }

    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (dbError) {
      const sanitizeErrorDetails = (value) =>
        String(value || '')
          .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://***')
          .replace(/password=[^&\s]+/gi, 'password=***')
          .slice(0, 2000)

      const code = dbError?.code || dbError?.name || 'UNKNOWN'
      return NextResponse.json(
        {
          error: 'Database unavailable',
          code,
          hint: 'Check DATABASE_URL and Prisma adapter configuration',
          details: sanitizeErrorDetails(dbError?.message || dbError),
        },
        { status: 503, headers: { 'x-error-code': String(code) } }
      )
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

    console.log(`[DASHBOARD-STATS] schoolId: ${schoolId}, totalStudents: ${totalStudents}`)

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
    const sanitizeErrorDetails = (value) =>
      String(value || '')
        .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://***')
        .replace(/password=[^&\s]+/gi, 'password=***')
        .slice(0, 2000)

    const auth = await authMiddleware(request)
    const isPrivileged =
      auth?.isAuthenticated && roleCheck(auth.user, ['ADMIN', 'headteacher', 'HEADTEACHER'])
    const canExpose = process.env.NODE_ENV === 'development' || isPrivileged
    const code = error?.code || error?.name || 'UNKNOWN'
    const devDetails = canExpose
      ? {
          details: sanitizeErrorDetails(error?.message || error),
          code,
          ...(process.env.NODE_ENV === 'development' && error?.stack ? { stack: error.stack } : {}),
        }
      : { code }

    if (isDbUnreachableError(error)) {
      return NextResponse.json(
        {
          error: 'Database unavailable',
          message: 'Cannot reach the database server. Check DATABASE_URL / network / SSL settings.',
          ...(devDetails || {}),
        },
        { status: 503, headers: { 'x-error-code': String(code) } }
      )
    }

    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error: 'Database schema out of date',
          message:
            'Database tables are missing. Run Prisma migrations (prisma migrate deploy) for this environment.',
          ...(devDetails || {}),
        },
        { status: 503, headers: { 'x-error-code': String(code) } }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', ...(devDetails || {}) },
      { status: 500, headers: { 'x-error-code': String(code) } }
    )
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
