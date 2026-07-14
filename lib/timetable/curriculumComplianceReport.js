/**
 * Curriculum compliance rows — reuses MISSING_PERIODS expected/placed math
 * (resolveExpectedPeriods + countPlacedPeriodWeight) for every allocation, not only gaps.
 */

import {
  resolveExpectedPeriods,
  countPlacedPeriodWeight,
  loadTimetableEntriesForAudit,
} from '@/lib/timetable/conflictAudit'

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function buildCurriculumComplianceReport(prisma, { schoolId, term, academicYear }) {
  const loaded = await loadTimetableEntriesForAudit(prisma, { schoolId, term, academicYear })
  const entries = loaded.entries || []

  const allocations = await prisma.teacherAllocation.findMany({
    where: { schoolId, term, academicYear, status: { in: ['pushed', 'scheduled'] } },
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true, isActive: true } },
    },
    orderBy: [{ teacherId: 'asc' }, { subjectId: 'asc' }],
  })

  const rows = []
  let shortCount = 0
  let compliantCount = 0
  let overCount = 0

  for (const alloc of allocations) {
    if (alloc.class?.isActive === false) continue
    const expected = resolveExpectedPeriods(alloc)
    if (expected <= 0) continue
    const placed = countPlacedPeriodWeight(entries, alloc.id)
    const delta = placed - expected
    let status = 'compliant'
    if (placed < expected) {
      status = 'short'
      shortCount += 1
    } else if (placed > expected) {
      status = 'over'
      overCount += 1
    } else {
      compliantCount += 1
    }

    rows.push({
      allocationId: alloc.id,
      teacherId: alloc.teacherId,
      teacherName: alloc.teacher?.name || 'Teacher',
      subjectId: alloc.subjectId,
      subjectName: alloc.subject?.name || 'Subject',
      subjectCode: alloc.subject?.code || null,
      classId: alloc.classId,
      className: alloc.class?.name || 'Class',
      expectedPeriods: expected,
      placedPeriods: placed,
      delta,
      status,
    })
  }

  rows.sort((a, b) => {
    const byTeacher = String(a.teacherName).localeCompare(String(b.teacherName))
    if (byTeacher) return byTeacher
    const bySubject = String(a.subjectName).localeCompare(String(b.subjectName))
    if (bySubject) return bySubject
    return String(a.className).localeCompare(String(b.className))
  })

  /** @type {Map<string, { teacherId: string, teacherName: string, rows: typeof rows, expected: number, placed: number }>} */
  const byTeacher = new Map()
  for (const row of rows) {
    if (!byTeacher.has(row.teacherId)) {
      byTeacher.set(row.teacherId, {
        teacherId: row.teacherId,
        teacherName: row.teacherName,
        rows: [],
        expected: 0,
        placed: 0,
      })
    }
    const g = byTeacher.get(row.teacherId)
    g.rows.push(row)
    g.expected += row.expectedPeriods
    g.placed += row.placedPeriods
  }

  return {
    schoolId,
    term,
    academicYear,
    source: loaded.source,
    entryCount: entries.length,
    generatedAt: new Date().toISOString(),
    summary: {
      allocations: rows.length,
      compliant: compliantCount,
      short: shortCount,
      over: overCount,
    },
    rows,
    byTeacher: [...byTeacher.values()],
  }
}
