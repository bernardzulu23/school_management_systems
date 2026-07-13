/**
 * Remove exact duplicate draft lesson rows (same class/subject/teacher/day/slot).
 * Keeps the earliest createdAt. Different subjects in the same slot are real
 * conflicts and are left for the auditor — only identical copies are deleted.
 */

export function exactDuplicateDraftKey(entry) {
  return [
    String(entry.classId || ''),
    String(entry.subjectId || ''),
    String(entry.teacherId || ''),
    String(entry.dayOfWeek || '')
      .trim()
      .toLowerCase(),
    String(entry.startTime || ''),
    String(entry.endTime || ''),
  ].join('|')
}

/**
 * @returns {{ deletedIds: string[], kept: number }}
 */
export function planExactDuplicateDraftDeletes(entries) {
  const sorted = [...(entries || [])].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime()
    const tb = new Date(b.createdAt || 0).getTime()
    if (ta !== tb) return ta - tb
    return String(a.id).localeCompare(String(b.id))
  })
  const seen = new Set()
  const deletedIds = []
  for (const e of sorted) {
    const key = exactDuplicateDraftKey(e)
    if (seen.has(key)) deletedIds.push(String(e.id))
    else seen.add(key)
  }
  return { deletedIds, kept: sorted.length - deletedIds.length }
}

export async function purgeExactDuplicateDraftEntries(prisma, { schoolId, term, academicYear }) {
  const entries = await prisma.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, status: 'draft' },
    select: {
      id: true,
      classId: true,
      subjectId: true,
      teacherId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      createdAt: true,
    },
  })

  const { deletedIds } = planExactDuplicateDraftDeletes(entries)
  if (!deletedIds.length) return { deleted: 0 }

  await prisma.timetableAllocationEntry.deleteMany({
    where: { schoolId, id: { in: deletedIds } },
  })

  return { deleted: deletedIds.length }
}
