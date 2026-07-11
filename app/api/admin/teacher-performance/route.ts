import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { recalculateTeacherPerformanceSummary } from '@/lib/teaching/performanceSummary'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

export const dynamic = 'force-dynamic'

async function departmentTeacherUserIds(
  schoolId: string,
  userId: string
): Promise<string[] | null> {
  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    include: { departmentRef: { select: { id: true, name: true } } },
  })
  if (!hodProfile) return []

  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.departmentRef?.name || hodProfile.department,
  })
  const departmentIds = Array.from(new Set(resolved.departmentIds.map(String)))
  const aliases = resolved.departmentNameAliases || []

  if (departmentIds.length === 0 && aliases.length === 0) return []

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      OR: [
        ...(departmentIds.length > 0
          ? [{ departments: { some: { departmentId: { in: departmentIds } } } }]
          : []),
        ...aliases.map((n: string) => ({
          department: { equals: String(n), mode: 'insensitive' as const },
        })),
      ],
    },
    select: { userId: true },
  })

  return teachers.map((t) => t.userId).filter(Boolean)
}

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

  const isAdmin = roleCheck(user, ['ADMIN', 'headteacher'])
  const isHod = roleCheck(user, ['HOD', 'hod']) && !isAdmin
  const scopedTeacherIds = isHod ? await departmentTeacherUserIds(schoolId, String(user.id)) : null

  if (isHod && (!scopedTeacherIds || scopedTeacherIds.length === 0)) {
    return NextResponse.json({
      term,
      academicYear,
      performance: [],
      scope: 'department',
      message: 'No teachers found in your department for Teaching Coverage.',
    })
  }

  const teacherFilter =
    scopedTeacherIds != null ? { teacherId: { in: scopedTeacherIds } } : undefined

  if (refresh) {
    const teachers = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['teacher', 'hod', 'TEACHER', 'HOD'] },
        ...(scopedTeacherIds != null ? { id: { in: scopedTeacherIds } } : {}),
      },
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
    where: { schoolId, term, academicYear, ...teacherFilter },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ completionRate: 'asc' }, { averageMasteryScore: 'asc' }],
  })

  const reteach = await prisma.topicMastery.findMany({
    where: {
      schoolId,
      needsReteaching: true,
      ...(scopedTeacherIds != null ? { teacherId: { in: scopedTeacherIds } } : {}),
    },
    select: {
      id: true,
      teacherId: true,
      topicName: true,
      averageMasteryScore: true,
      studentCount: true,
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

  performance.sort((a, b) => b.completionRate - a.completionRate)

  return NextResponse.json({
    term,
    academicYear,
    performance,
    scope: isHod ? 'department' : 'school',
  })
})
