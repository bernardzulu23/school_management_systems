import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'
import { requireHodSchoolAccess } from '@/lib/school/hodAccess'

export const dynamic = 'force-dynamic'

function parseTerm(termRaw) {
  const t = String(termRaw || '').trim()
  if (!t) return null
  const m = t.match(/(\d)/)
  const n = m ? Number(m[1]) : null
  if (n === 1 || n === 2 || n === 3) return n
  return null
}

export async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const hodLevelCheck = await requireHodSchoolAccess(schoolId)
  if (!hodLevelCheck.ok) return hodLevelCheck.response

  const isAllowedRole = roleCheck(auth.user, [
    'HOD',
    'hod',
    'headteacher',
    'ADMIN',
    'admin',
    'administrator',
    'superadmin',
  ])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!isAllowedRole && !hasHodProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = String(auth.user?.id || '')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    select: { departmentId: true, department: true, departmentRef: { select: { name: true } } },
  })
  if (!hodProfile) return NextResponse.json({ error: 'HOD profile not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const termNum = parseTerm(searchParams.get('term'))
  const yearRaw = String(searchParams.get('year') || '').trim()
  const year = Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : new Date().getFullYear()
  const term =
    termNum ||
    (() => {
      const m = new Date().getMonth()
      if (m <= 3) return 1
      if (m <= 7) return 2
      return 3
    })()

  const departmentId = hodProfile.departmentId || null
  const departmentName = hodProfile.departmentRef?.name || hodProfile.department || null

  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId,
    departmentName,
  })

  const departmentNameAliases = resolved.departmentNameAliases
  const departmentIds = new Set(resolved.departmentIds.map(String))

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      ...(departmentIds.size > 0 || departmentNameAliases.length > 0
        ? {
            OR: [
              ...(departmentIds.size > 0
                ? [
                    {
                      departments: {
                        some: { departmentId: { in: Array.from(departmentIds) } },
                      },
                    },
                  ]
                : []),
              ...(departmentNameAliases.length > 0
                ? [
                    {
                      OR: departmentNameAliases.map((n) => ({
                        department: { equals: String(n), mode: 'insensitive' },
                      })),
                    },
                  ]
                : []),
            ],
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  })

  await prisma.$transaction(
    teachers.map((t) =>
      prisma.teacherTermProgress.upsert({
        where: { teacherId_year_term: { teacherId: t.id, year, term } },
        update: { schoolId },
        create: { teacherId: t.id, schoolId, year, term },
      })
    )
  )

  const progress = await prisma.teacherTermProgress.findMany({
    where: { schoolId, year, term, teacherId: { in: teachers.map((t) => t.id) } },
    select: {
      teacherId: true,
      cpdHours: true,
      cpdTargetHours: true,
      schemeSubmitted: true,
      recordsSubmitted: true,
      updatedAt: true,
    },
  })
  const progressByTeacherId = new Map(progress.map((p) => [String(p.teacherId), p]))

  const teachersWithProgress = teachers.map((t) => {
    const p = progressByTeacherId.get(String(t.id))
    return {
      teacherId: t.id,
      name: t.user?.name || '',
      email: t.user?.email || '',
      cpdHours: p?.cpdHours ?? 0,
      cpdTargetHours: p?.cpdTargetHours ?? 10,
      schemeSubmitted: p?.schemeSubmitted === true,
      recordsSubmitted: p?.recordsSubmitted === true,
      updatedAt: p?.updatedAt || null,
    }
  })

  const totalTeachers = teachersWithProgress.length
  const schemeCount = teachersWithProgress.filter((t) => t.schemeSubmitted).length
  const recordsCount = teachersWithProgress.filter((t) => t.recordsSubmitted).length
  const totalCpdHours = teachersWithProgress.reduce((sum, t) => sum + (Number(t.cpdHours) || 0), 0)
  const totalCpdTarget = teachersWithProgress.reduce(
    (sum, t) => sum + (Number(t.cpdTargetHours) || 0),
    0
  )

  return NextResponse.json({
    success: true,
    data: {
      year,
      term: `Term ${term}`,
      summary: {
        totalTeachers,
        schemeCount,
        recordsCount,
        schemePercent: totalTeachers === 0 ? 0 : Math.round((schemeCount / totalTeachers) * 100),
        recordsPercent: totalTeachers === 0 ? 0 : Math.round((recordsCount / totalTeachers) * 100),
        totalCpdHours,
        totalCpdTarget,
        cpdPercent:
          totalCpdTarget === 0
            ? 0
            : Math.round((Math.min(totalCpdHours, totalCpdTarget) / totalCpdTarget) * 100),
      },
      teachers: teachersWithProgress,
    },
  })
}

export async function PATCH(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const hodLevelCheck = await requireHodSchoolAccess(schoolId)
  if (!hodLevelCheck.ok) return hodLevelCheck.response

  const isAllowedRole = roleCheck(auth.user, [
    'HOD',
    'hod',
    'headteacher',
    'ADMIN',
    'admin',
    'administrator',
    'superadmin',
  ])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!isAllowedRole && !hasHodProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const teacherId = String(body?.teacherId || '').trim()
  const termNum = parseTerm(body?.term)
  const year = Number.isFinite(Number(body?.year)) ? Number(body.year) : new Date().getFullYear()
  const term = termNum || 1

  if (!teacherId) return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })

  const data = {}
  if (body?.cpdHours !== undefined) {
    const v = Number(body.cpdHours)
    if (Number.isNaN(v) || v < 0)
      return NextResponse.json({ error: 'Invalid cpdHours' }, { status: 400 })
    data.cpdHours = Math.round(v)
  }
  if (body?.cpdTargetHours !== undefined) {
    const v = Number(body.cpdTargetHours)
    if (Number.isNaN(v) || v < 0)
      return NextResponse.json({ error: 'Invalid cpdTargetHours' }, { status: 400 })
    data.cpdTargetHours = Math.round(v)
  }
  if (body?.schemeSubmitted !== undefined) {
    data.schemeSubmitted = body.schemeSubmitted === true
  }
  if (body?.recordsSubmitted !== undefined) {
    data.recordsSubmitted = body.recordsSubmitted === true
  }

  await prisma.teacherTermProgress.upsert({
    where: { teacherId_year_term: { teacherId, year, term } },
    update: { ...data, schoolId },
    create: { teacherId, schoolId, year, term, ...data },
  })

  return NextResponse.json({ success: true })
}
