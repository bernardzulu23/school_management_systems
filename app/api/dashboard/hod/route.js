import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '')
  if (!userId) throw new ApiError('Unauthorized', 401)

  const isAdminOrHead = roleCheck(auth.user, ['ADMIN', 'headteacher'])

  const { searchParams } = new URL(request.url)
  const termRaw = String(searchParams.get('term') || '').trim()
  const yearRaw = String(searchParams.get('year') || '').trim()
  const year = Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : new Date().getFullYear()
  const termNum = (() => {
    if (!termRaw || termRaw === 'All Terms') return null
    const m = termRaw.match(/(\d)/)
    const n = m ? Number(m[1]) : null
    if (n === 1 || n === 2 || n === 3) return n
    return null
  })()
  const term = termNum ? `Term ${termNum}` : null
  const termRange = (() => {
    if (!termNum) return null
    if (termNum === 1)
      return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year, 4, 1)) }
    if (termNum === 2)
      return { gte: new Date(Date.UTC(year, 4, 1)), lt: new Date(Date.UTC(year, 8, 1)) }
    return { gte: new Date(Date.UTC(year, 8, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
  })()
  const resultTermWhere = term ? { term, year } : yearRaw ? { year } : {}

  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    include: {
      user: true,
      departmentRef: {
        include: {
          teachers: { include: { teacher: { include: { user: true } } } },
        },
      },
    },
  })

  if (!hodProfile) {
    throw new ApiError('HOD profile not found', 404)
  }

  const departmentId = hodProfile.departmentId || null
  const departmentName = hodProfile.departmentRef?.name || hodProfile.department || null

  if (!departmentId && !departmentName && !isAdminOrHead) {
    throw new ApiError('No department assigned', 400)
  }

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
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile_picture_url: true,
        },
      },
      teachingAssignments: { include: { class: true, subject: true } },
      departments: { include: { department: true } },
      classes: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const classById = new Map()
  const subjectById = new Map()

  for (const t of teachers) {
    for (const a of t.teachingAssignments || []) {
      if (a?.class?.id) classById.set(String(a.class.id), a.class)
      if (a?.subject?.id) subjectById.set(String(a.subject.id), a.subject)
    }
    for (const c of t.classes || []) {
      if (c?.id) classById.set(String(c.id), c)
    }
  }

  const classes = Array.from(classById.values())
  const subjects = Array.from(subjectById.values())

  const classNamesFromClasses = classes.map((c) => String(c.name)).filter(Boolean)

  const subjectIdSet = new Set(subjects.map((s) => String(s.id)).filter(Boolean))
  const subjectNameSet = new Set(subjects.map((s) => String(s.name)).filter(Boolean))
  const assignedSubjectNames = Array.from(
    new Set(
      teachers
        .flatMap((t) => (Array.isArray(t.assignedSubjects) ? t.assignedSubjects : []))
        .filter(Boolean)
        .map(String)
    )
  )

  if (assignedSubjectNames.length > 0) {
    const existingSubjects = await prisma.subject.findMany({
      where: {
        schoolId,
        OR: [{ name: { in: assignedSubjectNames } }, { id: { in: assignedSubjectNames } }],
      },
      select: { id: true, name: true },
    })
    existingSubjects.forEach((s) => {
      subjectIdSet.add(String(s.id))
      subjectNameSet.add(String(s.name))
    })
  }

  const studentsByClass =
    classNamesFromClasses.length > 0
      ? await prisma.student.findMany({
          where: { schoolId, class: { in: classNamesFromClasses } },
          include: {
            user: { select: { id: true, name: true, email: true, profile_picture_url: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 200,
        })
      : []

  const studentsByEnrollment =
    subjectIdSet.size > 0
      ? await (async () => {
          const enrollments = await prisma.pupilSubjectEnrollment.findMany({
            where: { schoolId, subjectId: { in: Array.from(subjectIdSet) } },
            distinct: ['pupilId'],
            select: { pupilId: true },
            take: 500,
          })
          const pupilIds = enrollments.map((e) => e.pupilId).filter(Boolean)
          if (pupilIds.length === 0) return []
          return prisma.student.findMany({
            where: { schoolId, id: { in: pupilIds } },
            include: {
              user: { select: { id: true, name: true, email: true, profile_picture_url: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 200,
          })
        })()
      : []

  const studentsBySelectedSubjects =
    studentsByClass.length === 0 && studentsByEnrollment.length === 0 && subjectNameSet.size > 0
      ? await prisma.student.findMany({
          where: { schoolId, selected_subjects: { hasSome: Array.from(subjectNameSet) } },
          include: {
            user: { select: { id: true, name: true, email: true, profile_picture_url: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 200,
        })
      : []

  const studentById = new Map()
  ;[...studentsByClass, ...studentsByEnrollment, ...studentsBySelectedSubjects].forEach((s) => {
    if (s?.id) studentById.set(String(s.id), s)
  })
  const students = Array.from(studentById.values())

  const classNamesFromStudents = Array.from(
    new Set(students.map((s) => String(s.class)).filter(Boolean))
  )
  const effectiveClassNames =
    classNamesFromClasses.length > 0 ? classNamesFromClasses : classNamesFromStudents

  if (classes.length === 0 && classNamesFromStudents.length > 0) {
    const classRecords = await prisma.class.findMany({
      where: { schoolId, name: { in: classNamesFromStudents } },
      orderBy: { name: 'asc' },
    })
    classRecords.forEach((c) => {
      if (c?.id) classById.set(String(c.id), c)
    })
  }
  const mergedClasses = Array.from(classById.values())

  const teacherUserIds = teachers.map((t) => String(t.user?.id || '')).filter(Boolean)
  const subjectIds = subjects.map((s) => String(s.id || '')).filter(Boolean)

  const resultOrClauses = [
    ...(teacherUserIds.length > 0 ? [{ enteredByUserId: { in: teacherUserIds } }] : []),
    ...(subjectIds.length > 0 ? [{ subjectId: { in: subjectIds } }] : []),
    ...(effectiveClassNames.length > 0
      ? [{ student: { class: { in: effectiveClassNames } } }]
      : []),
  ]

  let results = []
  try {
    results = await prisma.result.findMany({
      where: {
        schoolId,
        ...resultTermWhere,
        ...(resultOrClauses.length > 0 ? { OR: resultOrClauses } : {}),
      },
      include: { student: true, subject: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
  } catch (e) {
    console.error('[HOD Dashboard] Failed loading results:', e?.message)
  }

  const enteredByIds = Array.from(
    new Set(results.map((r) => String(r.enteredByUserId || '')).filter(Boolean))
  )
  const enteredByUsers = enteredByIds.length
    ? await prisma.user.findMany({
        where: { id: { in: enteredByIds } },
        select: { id: true, name: true },
        take: 2000,
      })
    : []
  const enteredByNameById = new Map(enteredByUsers.map((u) => [String(u.id), u.name]))

  const resultsWithMeta = results.map((r) => ({
    ...r,
    enteredByName: enteredByNameById.get(String(r.enteredByUserId || '')) || '',
    className: r.student?.class || '',
  }))

  let assessments = []
  if (effectiveClassNames.length > 0) {
    try {
      assessments = await prisma.assessment.findMany({
        where: {
          schoolId,
          class: { in: effectiveClassNames },
          ...(termRange ? { date: termRange } : {}),
        },
        orderBy: { date: 'desc' },
        take: 50,
      })
    } catch (e) {
      console.error('[HOD Dashboard] Failed loading assessments:', e?.message)
    }
  }

  let teacherAgg = []
  if (teacherUserIds.length > 0) {
    try {
      teacherAgg = await prisma.result.groupBy({
        by: ['enteredByUserId'],
        where: {
          schoolId,
          enteredByUserId: { in: teacherUserIds },
          ...(subjectIds.length > 0 ? { subjectId: { in: subjectIds } } : {}),
          ...resultTermWhere,
        },
        _avg: { score: true },
        _count: { _all: true },
      })
    } catch (e) {
      console.error('[HOD Dashboard] Failed aggregating teacher results:', e?.message)
    }
  }

  const aggByUserId = new Map(
    teacherAgg
      .filter((a) => a.enteredByUserId)
      .map((a) => [
        String(a.enteredByUserId),
        { avg: a._avg?.score || 0, count: a._count?._all || 0 },
      ])
  )

  const teacherPerformance = teachers
    .filter((t) => t?.user?.id)
    .map((t) => {
      const userId = String(t.user.id)
      const agg = aggByUserId.get(userId) || { avg: 0, count: 0 }
      const classSet = new Set()
      const subjectSet = new Set()
      ;(t.teachingAssignments || []).forEach((a) => {
        if (a?.class?.name) classSet.add(String(a.class.name))
        if (a?.subject?.name) subjectSet.add(String(a.subject.name))
      })
      return {
        userId,
        name: t.user.name || '',
        email: t.user.email || '',
        department:
          (Array.isArray(t.departments) && t.departments.length > 0
            ? t.departments
                .map((d) => d.department?.name)
                .filter(Boolean)
                .join(', ')
            : t.department) || '',
        averageScore: Math.round(Number(agg.avg) || 0),
        resultsEntered: Number(agg.count) || 0,
        classes: Array.from(classSet),
        subjects: Array.from(subjectSet),
      }
    })
    .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))

  return NextResponse.json({
    success: true,
    data: {
      department: {
        id: departmentId,
        name: departmentName,
      },
      selectedTerm: term || 'All Terms',
      selectedYear: year,
      stats: {
        totalTeachers: teachers.length,
        totalStudents: students.length,
        totalClasses: mergedClasses.length,
        totalSubjects: subjects.length,
        averagePerformance:
          results.length > 0
            ? Math.round(
                results.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / results.length
              )
            : 0,
        pendingLessonPlans: await prisma.lessonPlan.count({
          where: { schoolId, reviewerUserId: userId, status: 'SUBMITTED' },
        }),
        pendingAssessments: assessments.filter(
          (a) => String(a.status || '').toLowerCase() !== 'completed'
        ).length,
      },
      teachers,
      students,
      classes: mergedClasses,
      subjects,
      results: resultsWithMeta,
      assessments,
      teacherPerformance,
    },
  })
})
