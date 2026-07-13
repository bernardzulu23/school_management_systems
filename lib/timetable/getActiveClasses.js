/**
 * Server-side active class queries — used by timetable APIs.
 */

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} schoolId
 * @param {{ term?: string, academicYear?: string, includeStudents?: boolean, assignmentsOnly?: boolean }} [opts]
 */
export async function collectUsedClassIds(prisma, schoolId, opts = {}) {
  const term = String(opts.term || 'Term 1')
  const academicYear = String(opts.academicYear || new Date().getFullYear())
  const includeStudents = opts.assignmentsOnly ? false : opts.includeStudents !== false

  const [timetableRows, teachingRows, allocationRows, studentRows] = await Promise.all([
    prisma.timetableAllocationEntry.findMany({
      where: { schoolId, term, academicYear },
      select: { classId: true },
      distinct: ['classId'],
    }),
    opts.assignmentsOnly
      ? Promise.resolve([])
      : prisma.teachingAssignment.findMany({
          where: { schoolId },
          select: { classId: true },
          distinct: ['classId'],
        }),
    prisma.teacherAllocation.findMany({
      where: { schoolId, term, academicYear, status: { in: ['pushed', 'scheduled'] } },
      select: { classId: true },
      distinct: ['classId'],
    }),
    includeStudents
      ? prisma.student.findMany({
          where: { schoolId, classId: { not: null } },
          select: { classId: true },
          distinct: ['classId'],
        })
      : Promise.resolve([]),
  ])

  const ids = new Set()
  for (const row of [...timetableRows, ...teachingRows, ...allocationRows, ...studentRows]) {
    if (row?.classId) ids.add(String(row.classId))
  }
  return ids
}

/**
 * Sync Class.isActive from enrolment + teaching + timetable usage.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} schoolId
 * @param {{ term?: string, academicYear?: string, assignmentsOnly?: boolean }} [opts]
 */
export async function syncClassActiveFlags(prisma, schoolId, opts = {}) {
  const usedIds = await collectUsedClassIds(prisma, schoolId, opts)
  const used = Array.from(usedIds)

  if (used.length) {
    await prisma.class.updateMany({
      where: { schoolId, id: { in: used } },
      data: { isActive: true },
    })
  }

  await prisma.class.updateMany({
    where: {
      schoolId,
      ...(used.length ? { id: { notIn: used } } : {}),
    },
    data: { isActive: false },
  })
}

/**
 * Classes that are active for timetable UI (optionally timetable rows only).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} schoolId
 * @param {{ term?: string, academicYear?: string, timetableOnly?: boolean, timetableUi?: boolean }} [opts]
 */
export async function getActiveClasses(prisma, schoolId, opts = {}) {
  const term = String(opts.term || 'Term 1')
  const academicYear = String(opts.academicYear || new Date().getFullYear())
  const timetableOnly = opts.timetableOnly === true
  const timetableUi = opts.timetableUi !== false

  /** @type {import('@prisma/client').Prisma.ClassWhereInput} */
  const where = { schoolId, isActive: true }

  if (timetableOnly) {
    const timetableIds = (
      await prisma.timetableAllocationEntry.findMany({
        where: { schoolId, term, academicYear },
        select: { classId: true },
        distinct: ['classId'],
      })
    )
      .map((r) => String(r.classId))
      .filter(Boolean)
    if (!timetableIds.length) return []
    where.id = { in: timetableIds }
  } else if (timetableUi) {
    const usedIds = await collectUsedClassIds(prisma, schoolId, {
      term,
      academicYear,
      includeStudents: false,
    })
    const ids = Array.from(usedIds)
    if (!ids.length) return []
    where.id = { in: ids }
  }

  return prisma.class.findMany({
    where,
    orderBy: [{ year_group: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      year_group: true,
      section: true,
      isActive: true,
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { students: true } },
    },
  })
}
