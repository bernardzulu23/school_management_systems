import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { recalculateTeacherPerformanceSummary } from '@/lib/teaching/performanceSummary'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const term = Number(
    searchParams.get('term') || (new Date().getMonth() < 5 ? 1 : new Date().getMonth() < 9 ? 2 : 3)
  )
  const academicYear = Number(searchParams.get('academicYear') || new Date().getFullYear())
  const refresh = searchParams.get('refresh') === '1'

  if (refresh) {
    const teachers = await prisma.user.findMany({
      where: { schoolId, role: { in: ['teacher', 'hod', 'TEACHER', 'HOD'] } },
      select: { id: true },
    })
    await Promise.all(
      teachers.map((t) =>
        recalculateTeacherPerformanceSummary({
          schoolId,
          teacherId: t.id,
          term,
          academicYear,
        })
      )
    )
  }

  const rows = await prisma.teacherPerformanceSummary.findMany({
    where: { schoolId, term, academicYear },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ completionRate: 'asc' }, { averageMasteryScore: 'asc' }],
  })

  const reteach = await prisma.topicMastery.findMany({
    where: { schoolId, needsReteaching: true },
    select: {
      id: true,
      teacherId: true,
      topicName: true,
      averageMasteryScore: true,
      classId: true,
    },
  })

  const performance = rows.map((r) => ({
    id: r.id,
    teacherId: r.teacherId,
    teacherName: r.teacher.name,
    teacherEmail: r.teacher.email,
    term: r.term,
    academicYear: r.academicYear,
    completionRate: r.completionRate,
    averageMasteryScore: r.averageMasteryScore,
    topicsNeedingReteach: r.topicsNeedingReteach,
    totalSchemesAssigned: r.totalSchemesAssigned,
    totalWeeksPlanned: r.totalWeeksPlanned,
    totalWeeksCompleted: r.totalWeeksCompleted,
    topicsNeedingReteachDetails: reteach.filter((t) => t.teacherId === r.teacherId),
  }))

  // Highest coverage first (admin leaderboard); weak performers still visible via reteach counts
  performance.sort((a, b) => b.completionRate - a.completionRate)

  return NextResponse.json({ term, academicYear, performance })
})
