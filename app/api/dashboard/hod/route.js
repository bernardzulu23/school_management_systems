import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '')
  if (!userId) throw new ApiError('Unauthorized', 401)

  const isAdminOrHead = roleCheck(auth.user, ['ADMIN', 'headteacher'])

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

  const departmentNameAliases = Array.from(
    new Set(
      [departmentName].filter(Boolean).flatMap((n) => {
        const name = String(n)
        if (name === 'Arts and Design') return [name, 'Art and Design']
        if (name === 'Art and Design') return [name, 'Arts and Design']
        return [name]
      })
    )
  )

  const departmentIds = new Set([departmentId].filter(Boolean).map(String))
  if (departmentNameAliases.length > 0) {
    const byName = await prisma.department.findMany({
      where: { schoolId, name: { in: departmentNameAliases } },
      select: { id: true },
    })
    byName.forEach((d) => departmentIds.add(String(d.id)))
  }

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
                ? [{ department: { in: departmentNameAliases } }]
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

  const results =
    effectiveClassNames.length > 0
      ? await prisma.result.findMany({
          where: { schoolId, student: { class: { in: effectiveClassNames } } },
          include: { student: true, subject: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : []

  const assessments =
    effectiveClassNames.length > 0
      ? await prisma.assessment.findMany({
          where: { schoolId, class: { in: effectiveClassNames } },
          orderBy: { date: 'desc' },
          take: 50,
        })
      : []

  return NextResponse.json({
    success: true,
    data: {
      department: {
        id: departmentId,
        name: departmentName,
      },
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
        pendingAssessments: assessments.filter(
          (a) => String(a.status || '').toLowerCase() !== 'completed'
        ).length,
      },
      teachers,
      students,
      classes: mergedClasses,
      subjects,
      results,
      assessments,
    },
  })
})
