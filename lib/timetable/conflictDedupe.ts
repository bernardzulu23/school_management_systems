import type { Conflict } from '@/lib/timetable/types'
import { filterClassCentricConflicts } from '@/lib/timetable/classCentric'

/** Stable key for the same logical clash reported on multiple assignments. */
export function conflictDedupeKey(conflict: Conflict): string {
  const assignmentIds = [...(conflict.related?.assignmentIds || [])].map(String).sort().join(',')
  const classIds = [...(conflict.related?.classIds || [])].map(String).sort().join(',')
  const teacherIds = [...(conflict.related?.teacherIds || [])].map(String).sort().join(',')
  const classroomIds = [...(conflict.related?.classroomIds || [])].map(String).sort().join(',')
  return [
    conflict.type,
    conflict.severity,
    conflict.message,
    assignmentIds,
    classIds,
    teacherIds,
    classroomIds,
  ].join('|')
}

export function dedupeConflicts(conflicts: Iterable<Conflict>): Conflict[] {
  const seen = new Set<string>()
  const out: Conflict[] = []
  for (const conflict of conflicts) {
    const key = conflictDedupeKey(conflict)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(conflict)
  }
  return out
}

export function dedupeConflictsFromMap(conflicts: Map<string, Conflict[]>): Conflict[] {
  const all: Conflict[] = []
  for (const list of conflicts.values()) {
    all.push(...filterClassCentricConflicts(list))
  }
  return dedupeConflicts(all)
}

export function countUniqueConflicts(conflicts: Map<string, Conflict[]>): number {
  return dedupeConflictsFromMap(conflicts).length
}

export function primaryAssignmentId(conflict: Conflict, fallback = ''): string {
  const ids = conflict.related?.assignmentIds
  if (Array.isArray(ids) && ids.length > 0) return String(ids[0])
  return fallback
}

export function affectedAssignmentCount(conflict: Conflict): number {
  const n = conflict.related?.assignmentIds?.length
  return typeof n === 'number' && n > 0 ? n : 1
}
