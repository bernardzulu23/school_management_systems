import { resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'

function sortClasses(classes) {
  return [...classes].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  )
}

function mapClassDto(c, departmentId) {
  return {
    id: c.id,
    name: c.name,
    classId: c.name,
    form: c.year_group || '',
    section: c.section || '',
    departmentId: c.departmentId || departmentId || null,
    department: c.department || null,
    label: c.name || `${c.year_group || ''}${c.section || ''}`.trim(),
    gradeLabel: c.name,
  }
}

/**
 * Resolve classes available for HOD allocation / department-scoped timetable UI.
 * Uses Class.departmentId, teacher teaching load (assignments, homeroom, subjects, allocations),
 * and legacy Teacher.department string matching.
 */
export async function resolveDepartmentClasses(
  prisma,
  { schoolId, departmentId, teacherUserId = '' }
) {
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, schoolId },
    select: { id: true, name: true },
  })
  if (!dept) return { department: null, classes: [] }

  const classById = new Map()

  const directClasses = await prisma.class.findMany({
    where: { schoolId, departmentId },
    include: { department: { select: { id: true, name: true, code: true } } },
  })
  for (const c of directClasses) {
    if (c?.id) classById.set(String(c.id), c)
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      OR: [
        { departments: { some: { departmentId } } },
        { department: { equals: dept.name, mode: 'insensitive' } },
      ],
    },
    include: {
      teachingAssignments: { include: { class: true, subject: true } },
      classes: true,
      subjects: true,
      user: { select: { id: true, name: true } },
    },
  })

  const teacherFilter = String(teacherUserId || '').trim()
  const scopedTeachers = teacherFilter
    ? teachers.filter((t) => String(t.userId) === teacherFilter)
    : teachers

  for (const teacher of scopedTeachers) {
    const load = await resolveTeacherLoad({ schoolId, teacher, tx: prisma })
    for (const [, c] of load.classById) {
      if (c?.id) classById.set(String(c.id), c)
    }
  }

  if (classById.size === 0 && scopedTeachers.length > 0) {
    const teacherIds = scopedTeachers.map((t) => t.id)
    const subjectLinked = await prisma.subject.findMany({
      where: {
        schoolId,
        classId: { not: null },
        OR: [
          { teacherId: { in: teacherIds } },
          { name: { equals: dept.name, mode: 'insensitive' } },
        ],
      },
      include: { class: true },
    })
    for (const s of subjectLinked) {
      if (s.class?.id) classById.set(String(s.class.id), s.class)
    }
  }

  const classes = sortClasses(Array.from(classById.values())).map((c) =>
    mapClassDto(c, departmentId)
  )

  return { department: dept, classes }
}
