import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import { validateTimetable, getHardConflicts } from '@/lib/timetable/validateTimetable'

/** Return hard matrix conflicts for draft TimetableAllocationEntry-shaped rows. */
export function getHardConflictsForDraftEntries(entries) {
  const assignments = mapDbEntriesToAssignments(entries || [])
  const raw = validateTimetable(assignments)
  return getHardConflicts(raw)
}

/** Validate a patched draft entry set; returns hard conflicts if any. */
export function validatePatchedDraftEntries(allEntries, entryId, patch) {
  const merged = (allEntries || []).map((e) => {
    if (String(e.id) !== String(entryId)) return e
    return { ...e, ...patch }
  })
  return getHardConflictsForDraftEntries(merged)
}
