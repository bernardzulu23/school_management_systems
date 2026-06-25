import type { Assignment, Conflict } from '@/lib/timetable/types'

/** Class ids that appear on at least one timetable assignment row. */
export function activeClassIdsFromAssignments(assignments: Assignment[] = []): Set<string> {
  const ids = new Set<string>()
  for (const a of assignments) {
    const id = String(a?.classId || '').trim()
    if (id) ids.add(id)
  }
  return ids
}

function assignmentByIdMap(assignments: Assignment[]): Map<string, Assignment> {
  return new Map(assignments.map((a) => [String(a.id), a]))
}

/**
 * True when a conflict only references classes with no timetable assignments
 * (stale duplicate Class rows, enrolment shells, etc.).
 */
export function conflictReferencesInactiveClass(
  conflict: Conflict,
  activeClassIds: Set<string>,
  assignmentById: Map<string, Assignment>
): boolean {
  if (activeClassIds.size === 0) return false

  const classIds = (conflict.related?.classIds || []).map(String).filter(Boolean)
  if (classIds.length > 0) {
    return classIds.every((id) => !activeClassIds.has(id))
  }

  const assignmentIds = (conflict.related?.assignmentIds || []).map(String).filter(Boolean)
  if (assignmentIds.length > 0) {
    return assignmentIds.every((aid) => {
      const row = assignmentById.get(aid)
      if (!row) return true
      const cid = String(row.classId || '').trim()
      return !cid || !activeClassIds.has(cid)
    })
  }

  return false
}

/** Drop conflicts tied to classes with zero draft/preview assignments. */
export function filterConflictsForActiveClasses<T extends Conflict>(
  conflicts: T[],
  assignments: Assignment[] = []
): T[] {
  const activeClassIds = activeClassIdsFromAssignments(assignments)
  if (activeClassIds.size === 0) return conflicts
  const byId = assignmentByIdMap(assignments)
  return conflicts.filter((c) => !conflictReferencesInactiveClass(c, activeClassIds, byId))
}

/** Client store shape: Map keyed by assignment id. */
export function filterConflictMapForActiveClasses(
  conflicts: Map<string, Conflict[]>,
  assignments: Assignment[] = []
): Map<string, Conflict[]> {
  const activeClassIds = activeClassIdsFromAssignments(assignments)
  if (activeClassIds.size === 0) return conflicts
  const byId = assignmentByIdMap(assignments)
  const next = new Map<string, Conflict[]>()
  for (const [key, list] of conflicts.entries()) {
    const filtered = (list || []).filter(
      (c) => !conflictReferencesInactiveClass(c, activeClassIds, byId)
    )
    if (filtered.length > 0) next.set(key, filtered)
  }
  return next
}
