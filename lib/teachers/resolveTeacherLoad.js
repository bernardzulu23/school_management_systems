import prisma from '@/lib/prisma'

export function currentTermAndYear() {
  const now = new Date()
  const month = now.getMonth() + 1
  const term = month <= 4 ? 'Term 1' : month <= 8 ? 'Term 2' : 'Term 3'
  return { term, academicYear: String(now.getFullYear()) }
}

/**
 * Resolve a teacher's teaching load: TeachingAssignment rows, allocations, M2M classes/subjects.
 * @param {object} opts
 * @param {string} opts.schoolId
 * @param {object} opts.teacher - Teacher with teachingAssignments, classes, subjects, assignedSubjects, id, userId
 * @param {import('@prisma/client').Prisma.TransactionClient} [opts.tx]
 */
export async function resolveTeacherLoad({ schoolId, teacher, tx = prisma }) {
  if (!teacher?.id || !schoolId) {
    return {
      assignments: [],
      classById: new Map(),
      subjectById: new Map(),
      virtualOnly: false,
    }
  }

  const classById = new Map()
  const subjectById = new Map()
  const assignmentKeys = new Set()
  const assignments = []

  const pushAssignment = (row) => {
    const key = `${row.teacherId}|${row.subjectId}|${row.classId}`
    if (assignmentKeys.has(key)) return
    assignmentKeys.add(key)
    assignments.push(row)
    if (row.class?.id) classById.set(String(row.class.id), row.class)
    if (row.subject?.id) subjectById.set(String(row.subject.id), row.subject)
  }

  for (const a of teacher.teachingAssignments || []) {
    pushAssignment(a)
  }

  for (const c of teacher.classes || []) {
    if (c?.id) classById.set(String(c.id), c)
  }
  for (const s of teacher.subjects || []) {
    if (s?.id) subjectById.set(String(s.id), s)
  }

  const assignedSubjectNames = Array.isArray(teacher.assignedSubjects)
    ? teacher.assignedSubjects.map(String).filter(Boolean)
    : []

  if (assignedSubjectNames.length > 0) {
    const existingSubjects = await tx.subject.findMany({
      where: {
        schoolId,
        OR: [{ name: { in: assignedSubjectNames } }, { id: { in: assignedSubjectNames } }],
      },
    })
    existingSubjects.forEach((s) => {
      if (s?.id) subjectById.set(String(s.id), s)
    })
  }

  const { term, academicYear } = currentTermAndYear()
  const teacherUserId = teacher.userId || teacher.user?.id

  const allocations = teacherUserId
    ? await tx.teacherAllocation.findMany({
        where: {
          schoolId,
          teacherId: teacherUserId,
          status: { in: ['pushed', 'scheduled'] },
          term,
          academicYear,
        },
        include: {
          class: true,
          subject: true,
        },
      })
    : []

  for (const alloc of allocations) {
    pushAssignment({
      id: `alloc:${alloc.id}`,
      teacherId: teacher.id,
      subjectId: alloc.subjectId,
      classId: alloc.classId,
      class: alloc.class,
      subject: alloc.subject,
    })
  }

  const homeroomClasses = await tx.class.findMany({
    where: { schoolId, teacherId: teacher.id },
  })
  homeroomClasses.forEach((c) => {
    if (c?.id) classById.set(String(c.id), c)
  })

  if (assignments.length === 0 && (subjectById.size > 0 || classById.size > 0)) {
    const subjects = Array.from(subjectById.values())
    const classes = Array.from(classById.values())
    const subjectClassIds = Array.from(
      new Set(subjects.map((s) => String(s?.classId || '')).filter(Boolean))
    )
    const subjectClasses =
      subjectClassIds.length > 0
        ? await tx.class.findMany({
            where: { schoolId, id: { in: subjectClassIds } },
          })
        : []
    const extraClassById = new Map(subjectClasses.map((c) => [String(c.id), c]))
    subjectClasses.forEach((c) => classById.set(String(c.id), c))

    const resolvedClasses = classes.length > 0 ? classes : subjectClasses

    for (const s of subjects) {
      const preferredClassId = s?.classId ? String(s.classId) : ''
      const preferredClass = preferredClassId ? extraClassById.get(preferredClassId) : null
      if (preferredClass) {
        pushAssignment({
          id: `virtual:${preferredClass.id}:${s.id}`,
          teacherId: teacher.id,
          classId: preferredClass.id,
          subjectId: s.id,
          class: preferredClass,
          subject: s,
        })
        continue
      }
      for (const c of resolvedClasses) {
        pushAssignment({
          id: `virtual:${c.id}:${s.id}`,
          teacherId: teacher.id,
          classId: c.id,
          subjectId: s.id,
          class: c,
          subject: s,
        })
      }
    }
  }

  return {
    assignments,
    classById,
    subjectById,
    virtualOnly: assignments.every((a) => String(a.id).startsWith('virtual:')),
  }
}

/**
 * Map teaching load to API assignment DTOs (teaching-assignments route).
 */
export function formatTeachingAssignmentDtos(assignments, teacherName) {
  return assignments.map((a) => ({
    id: a.id,
    teacherId: a.teacherId,
    teacherName: teacherName || null,
    classId: a.classId,
    className: a.class?.name || 'Unknown Class',
    classYearGroup: a.class?.year_group || null,
    subjectId: a.subjectId,
    subjectName: a.subject?.name || 'Unknown Subject',
    createdAt: a.createdAt || null,
  }))
}
