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

  const role = String(auth.user?.role || '').toLowerCase()
  const isAdminOrHead = roleCheck(auth.user, ['ADMIN', 'headteacher'])

  const hod = await prisma.headOfDepartment.findFirst({
    where: { schoolId, userId },
    include: { departmentRef: true },
  })

  if (!hod && !isAdminOrHead) {
    throw new ApiError('Forbidden', 403)
  }

  const departmentId = hod?.departmentId || null
  const departmentName = hod?.departmentRef?.name || hod?.department || null

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

  const classNames = classes.map((c) => String(c.name)).filter(Boolean)

  const students =
    classNames.length > 0
      ? await prisma.student.findMany({
          where: { schoolId, class: { in: classNames } },
          include: {
            user: { select: { id: true, name: true, email: true, profile_picture_url: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 200,
        })
      : []

  const results =
    classNames.length > 0
      ? await prisma.result.findMany({
          where: { schoolId, student: { class: { in: classNames } } },
          include: { student: true, subject: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : []

  const assessments =
    classNames.length > 0
      ? await prisma.assessment.findMany({
          where: { schoolId, class: { in: classNames } },
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
        totalClasses: classes.length,
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
      classes,
      subjects,
      results,
      assessments,
    },
  })
})
