import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
} from '@/lib/timetable/validateTimetable'

/**
 * Load draft TimetableAllocationEntry rows and validate before publish.
 */
export async function validateDraftEntriesForPublish(prisma, { schoolId, term, academicYear }) {
  const entries = await prisma.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, status: 'draft' },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })

  if (!entries.length) {
    return {
      ok: false,
      error: 'No draft timetable to publish.',
      code: 'NO_DRAFT',
      hard: [],
      soft: [],
      entryCount: 0,
    }
  }

  const assignments = mapDbEntriesToAssignments(entries)
  const all = validateTimetable(assignments, { includeRoomChecks: false })
  const hard = getHardConflicts(all)
  const soft = getSoftConflicts(all)

  return {
    ok: hard.length === 0,
    hard,
    soft,
    entryCount: entries.length,
    assignments,
  }
}
