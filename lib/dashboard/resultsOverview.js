import { roleCheck } from '@/lib/middleware/auth'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'
import { resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'

function sortByName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''))
}

function uniqueByName(items) {
  const map = new Map()
  for (const item of items) {
    const name = String(item?.name || '').trim()
    if (!name) continue
    map.set(name.toLowerCase(), { ...item, name })
  }
  return Array.from(map.values())
}

async function getHodDepartmentTeachers(prisma, schoolId, userId) {
  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    select: { departmentId: true, department: true },
  })
  if (!hodProfile) return { teachers: [], departmentIds: [], departmentNameAliases: [] }

  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.department,
  })

  const { departmentIds, departmentNameAliases } = resolved
  const departmentIdList = Array.from(departmentIds)

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      ...(departmentIdList.length > 0 || departmentNameAliases.length > 0
        ? {
            OR: [
              ...(departmentIdList.length > 0
                ? [{ departments: { some: { departmentId: { in: departmentIdList } } } }]
                : []),
              ...(departmentNameAliases.length > 0
                ? departmentNameAliases.map((n) => ({
                    department: { equals: String(n), mode: 'insensitive' },
                  }))
                : []),
            ],
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      teachingAssignments: { include: { class: true, subject: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return { teachers, departmentIds: departmentIdList, departmentNameAliases }
}

async function getSchoolTeachers(prisma, schoolId) {
  return prisma.teacher.findMany({
    where: { schoolId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      teachingAssignments: { include: { class: true, subject: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

function buildFilterOptionsFromAssignments(assignments, teachers) {
  const classes = []
  const subjects = []
  const teacherOptions = []
  const teacherIdsWithAssignments = new Set(
    assignments.map((a) => String(a.teacherId || '')).filter(Boolean)
  )

  for (const a of assignments) {
    if (a.class?.id && a.class?.name) {
      classes.push({ id: String(a.class.id), name: String(a.class.name) })
    }
    if (a.subject?.id && a.subject?.name) {
      subjects.push({ id: String(a.subject.id), name: String(a.subject.name) })
    }
  }

  for (const t of teachers) {
    const teacherId = String(t.id || '')
    if (teacherIdsWithAssignments.size > 0 && !teacherIdsWithAssignments.has(teacherId)) continue
    const userId = String(t.user?.id || '').trim()
    const name = String(t.user?.name || t.user?.email || '').trim()
    if (!userId || !name) continue
    teacherOptions.push({ id: userId, name })
  }

  return {
    classes: uniqueByName(classes).sort(sortByName),
    subjects: uniqueByName(subjects).sort(sortByName),
    teachers: uniqueByName(teacherOptions).sort(sortByName),
  }
}

async function enrichFiltersFromEnrollments(prisma, schoolId, filters, scope = {}) {
  const { classIds, subjectIds } = scope
  const enrollmentWhere = {
    schoolId,
    ...(classIds?.length ? { classId: { in: classIds } } : {}),
    ...(subjectIds?.length ? { subjectId: { in: subjectIds } } : {}),
  }

  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: enrollmentWhere,
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
    take: 50000,
  })

  const classMap = new Map(filters.classes.map((c) => [c.name.toLowerCase(), c]))
  const subjectMap = new Map(filters.subjects.map((s) => [s.name.toLowerCase(), s]))

  for (const e of enrollments) {
    if (e.class?.name) {
      classMap.set(String(e.class.name).toLowerCase(), {
        id: String(e.class.id),
        name: String(e.class.name),
      })
    }
    if (e.subject?.name) {
      subjectMap.set(String(e.subject.name).toLowerCase(), {
        id: String(e.subject.id),
        name: String(e.subject.name),
      })
    }
  }

  if (classMap.size === 0) {
    const schoolClasses = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 5000,
    })
    schoolClasses.forEach((c) => {
      if (c.name) classMap.set(String(c.name).toLowerCase(), { id: String(c.id), name: c.name })
    })
  }

  if (subjectMap.size === 0) {
    const schoolSubjects = await prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 5000,
    })
    schoolSubjects.forEach((s) => {
      if (s.name) subjectMap.set(String(s.name).toLowerCase(), { id: String(s.id), name: s.name })
    })
  }

  return {
    classes: Array.from(classMap.values()).sort(sortByName),
    subjects: Array.from(subjectMap.values()).sort(sortByName),
    teachers: filters.teachers,
  }
}

export async function resolveResultsScope({ prisma, schoolId, user }) {
  const role = String(user?.role || '').toLowerCase()
  const isHeadteacher =
    role === 'headteacher' || role === 'admin' || role === 'administrator' || role === 'superadmin'
  const isHod = role === 'hod'
  const isTeacher = role === 'teacher'

  if (isHeadteacher) {
    const teachers = await getSchoolTeachers(prisma, schoolId)
    const assignments = teachers.flatMap((t) => t.teachingAssignments || [])
    const filters = await enrichFiltersFromEnrollments(
      prisma,
      schoolId,
      buildFilterOptionsFromAssignments(assignments, teachers)
    )
    return {
      scope: 'school',
      filters,
      teacherUserIds: teachers.map((t) => String(t.user?.id || '')).filter(Boolean),
      classNames: filters.classes.map((c) => c.name),
      subjectIds: filters.subjects.map((s) => s.id),
    }
  }

  if (isHod) {
    const { teachers } = await getHodDepartmentTeachers(prisma, schoolId, user.id)
    const assignments = teachers.flatMap((t) => t.teachingAssignments || [])
    const classIds = Array.from(
      new Set(assignments.map((a) => String(a.classId || '')).filter(Boolean))
    )
    const subjectIds = Array.from(
      new Set(assignments.map((a) => String(a.subjectId || '')).filter(Boolean))
    )
    const filters = await enrichFiltersFromEnrollments(
      prisma,
      schoolId,
      buildFilterOptionsFromAssignments(assignments, teachers),
      { classIds, subjectIds }
    )
    return {
      scope: 'department',
      filters,
      teacherUserIds: teachers.map((t) => String(t.user?.id || '')).filter(Boolean),
      classNames: filters.classes.map((c) => c.name),
      subjectIds: filters.subjects.map((s) => s.id),
    }
  }

  if (isTeacher) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId: user.id, schoolId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        classes: true,
        subjects: true,
        teachingAssignments: {
          where: { schoolId },
          include: { class: true, subject: true },
        },
      },
    })

    if (!teacher) {
      return {
        scope: 'teacher',
        filters: { classes: [], subjects: [], teachers: [] },
        teacherUserIds: [String(user.id)],
        classNames: [],
        subjectIds: [],
      }
    }

    const { assignments } = await resolveTeacherLoad({ schoolId, teacher })
    const classIds = Array.from(new Set(assignments.map((a) => String(a.classId)).filter(Boolean)))
    const subjectIds = Array.from(
      new Set(assignments.map((a) => String(a.subjectId)).filter(Boolean))
    )
    const filters = await enrichFiltersFromEnrollments(
      prisma,
      schoolId,
      buildFilterOptionsFromAssignments(assignments, [teacher]),
      { classIds, subjectIds }
    )

    return {
      scope: 'teacher',
      filters,
      teacherUserIds: [String(user.id)],
      classNames: filters.classes.map((c) => c.name),
      subjectIds: filters.subjects.map((s) => s.id),
    }
  }

  return null
}

export async function fetchResultsOverview({
  prisma,
  schoolId,
  user,
  className = '',
  subjectName = '',
  teacherUserId = '',
  limit = 200,
}) {
  const scopeResult = await resolveResultsScope({ prisma, schoolId, user })
  if (!scopeResult) {
    return { filters: { classes: [], subjects: [], teachers: [] }, results: [] }
  }

  const { filters, teacherUserIds, classNames, subjectIds } = scopeResult
  const role = String(user?.role || '').toLowerCase()
  const isHeadteacher =
    role === 'headteacher' || role === 'admin' || role === 'administrator' || role === 'superadmin'
  const isHod = role === 'hod'

  const andClauses = [{ schoolId }]

  if (className) {
    andClauses.push({ student: { class: className } })
  } else if (!isHeadteacher && classNames.length > 0) {
    andClauses.push({ student: { class: { in: classNames } } })
  }

  if (subjectName) {
    andClauses.push({ subject: { name: subjectName } })
  } else if (!isHeadteacher && subjectIds.length > 0) {
    andClauses.push({ subjectId: { in: subjectIds } })
  }

  if (teacherUserId) {
    andClauses.push({ enteredByUserId: teacherUserId })
  } else if (!isHeadteacher && !isHod && teacherUserIds.length > 0) {
    andClauses.push({ enteredByUserId: { in: teacherUserIds } })
  } else if (isHod && teacherUserIds.length > 0) {
    andClauses.push({
      OR: [
        { enteredByUserId: { in: teacherUserIds } },
        ...(subjectIds.length > 0 ? [{ subjectId: { in: subjectIds } }] : []),
        ...(classNames.length > 0 ? [{ student: { class: { in: classNames } } }] : []),
      ],
    })
  }

  const where = andClauses.length === 1 ? andClauses[0] : { AND: andClauses }

  const rows = await prisma.result.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      student: { select: { name: true, class: true, exam_number: true } },
      subject: { select: { name: true } },
    },
    take: Math.min(Math.max(Number(limit) || 200, 1), 500),
  })

  const enteredByIds = Array.from(
    new Set(rows.map((r) => String(r.enteredByUserId || '')).filter(Boolean))
  )
  const enteredByUsers =
    enteredByIds.length > 0
      ? await prisma.user.findMany({
          where: { schoolId, id: { in: enteredByIds } },
          select: { id: true, name: true, email: true },
          take: 5000,
        })
      : []
  const teacherNameById = new Map(
    enteredByUsers.map((u) => [
      String(u.id),
      String(u.name || u.email || '')
        .trim()
        .replace(/\s+/g, ' '),
    ])
  )

  const results = rows.map((r) => {
    const percentage = Math.round(Number(r.score || 0))
    return {
      id: r.id,
      student_name: r.student?.name || 'Student',
      student_id: r.student?.exam_number || '',
      teacher_name: teacherNameById.get(String(r.enteredByUserId || '')) || '',
      assessment: `${r.term || ''} ${r.year || ''}`.trim() || 'Assessment',
      subject: r.subject?.name || '',
      class: r.student?.class || '',
      date: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '',
      marks: percentage,
      total: 100,
      percentage,
      grade:
        r.grade || (percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 50 ? 'C' : 'D'),
      term: r.term,
      year: r.year,
    }
  })

  return { filters, results }
}

export function canAccessResultsOverview(user) {
  return roleCheck(user, [
    'ADMIN',
    'headteacher',
    'HOD',
    'hod',
    'TEACHER',
    'teacher',
    'administrator',
    'superadmin',
  ])
}
