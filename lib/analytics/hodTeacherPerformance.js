import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

function normalizeTerm(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower === 'all terms' || lower === 'all') return ''
  if (lower.startsWith('term')) {
    const digits = lower.replace(/[^0-9]/g, '')
    if (digits) return `Term ${Number(digits)}`
  }
  return raw
}

export async function getHodTeacherPerformance({ prisma, schoolId, userId, term, year }) {
  const termFilter = normalizeTerm(term)
  const yearFilter = year ? Number(year) : null

  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    include: { departmentRef: true },
  })

  if (!hodProfile) {
    const err = new Error('HOD profile not found')
    err.statusCode = 404
    throw err
  }

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
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile_picture_url: true,
        },
      },
      teachingAssignments: { include: { class: true, subject: true } },
      departments: { include: { department: true } },
      classes: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20000,
  })

  const teacherUserIds = teachers.map((t) => String(t.user?.id || '')).filter(Boolean)
  const subjectIds = Array.from(
    new Set(
      teachers
        .flatMap((t) => (t.teachingAssignments || []).map((a) => a?.subject?.id).filter(Boolean))
        .map(String)
    )
  )

  const teacherAgg =
    teacherUserIds.length > 0
      ? await prisma.result.groupBy({
          by: ['enteredByUserId'],
          where: {
            schoolId,
            enteredByUserId: { in: teacherUserIds },
            ...(subjectIds.length > 0 ? { subjectId: { in: subjectIds } } : {}),
            ...(termFilter ? { term: termFilter } : {}),
            ...(yearFilter ? { year: yearFilter } : {}),
          },
          _avg: { score: true },
          _count: { _all: true },
          take: 50000,
        })
      : []

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
      const id = String(t.user.id)
      const agg = aggByUserId.get(id) || { avg: 0, count: 0 }
      const classSet = new Set()
      const subjectSet = new Set()
      ;(t.teachingAssignments || []).forEach((a) => {
        if (a?.class?.name) classSet.add(String(a.class.name))
        if (a?.subject?.name) subjectSet.add(String(a.subject.name))
      })
      return {
        userId: id,
        name: t.user.name || '',
        email: t.user.email || '',
        profile_picture_url: t.user.profile_picture_url || '',
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

  return {
    department: { id: departmentId, name: departmentName },
    term: termFilter || 'All Terms',
    year: yearFilter || null,
    teacherPerformance,
  }
}
