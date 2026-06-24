import type { Assignment, TimeSlot } from './types'
import { CollisionDetector } from './collisionDetector'
import { dedupeConflictsFromMap } from './conflictDedupe'
import { classesFromAssignments } from './zambiaTerminology'

function toMinutes(time: string): number {
  const [h, m] = String(time || '0:0')
    .split(':')
    .map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

function timesOverlap(a: Assignment, b: Assignment): boolean {
  if (String(a.dayOfWeek).toLowerCase() !== String(b.dayOfWeek).toLowerCase()) return false
  const a0 = toMinutes(a.startTime)
  const a1 = toMinutes(a.endTime)
  const b0 = toMinutes(b.startTime)
  const b1 = toMinutes(b.endTime)
  if (a1 <= a0 || b1 <= b0) return false
  return a0 < b1 && b0 < a1
}

export type DuplicateSlotGroup = {
  classId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  assignmentIds: string[]
}

/** Same class + overlapping time on one day (grade double-booking). */
export function findDuplicateSlots(assignments: Assignment[]): DuplicateSlotGroup[] {
  const active = (assignments || []).filter((a) => a && !a.isBreak)
  const groups = new Map<string, DuplicateSlotGroup>()

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]
      if (String(a.classId) !== String(b.classId)) continue
      if (!timesOverlap(a, b)) continue

      const classId = String(a.classId)
      const dayOfWeek = String(a.dayOfWeek)
      const startTime = String(a.startTime)
      const endTime = String(a.endTime)
      const key = `${classId}|${dayOfWeek.toLowerCase()}|${startTime}|${endTime}|${toMinutes(a.startTime)}|${toMinutes(a.endTime)}`

      const existing = groups.get(key)
      const ids = [String(a.id), String(b.id)]
      if (existing) {
        for (const id of ids) {
          if (!existing.assignmentIds.includes(id)) existing.assignmentIds.push(id)
        }
      } else {
        groups.set(key, {
          classId,
          dayOfWeek,
          startTime,
          endTime,
          assignmentIds: [...new Set(ids)],
        })
      }
    }
  }

  return Array.from(groups.values())
}

/** Keep one assignment per class + day + exact start/end (drops accumulated duplicates). */
export function dedupeAssignmentsByClassSlot(assignments: Assignment[]): Assignment[] {
  const seen = new Set<string>()
  const out: Assignment[] = []
  for (const a of assignments || []) {
    if (!a) continue
    if (a.isBreak) {
      out.push(a)
      continue
    }
    const key = `${String(a.classId)}|${String(a.dayOfWeek).toLowerCase()}|${a.startTime}|${a.endTime}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}

const CRITICAL_DOUBLE_TYPES = new Set(['ClassDoubleBooked', 'TeacherDoubleBooked'])

export function countCriticalDoubleBookings(
  assignments: Assignment[],
  opts?: { timeSlots?: TimeSlot[]; seasonMode?: 'normal' | 'planting' | 'harvest' }
): number {
  if (!assignments?.length) return 0
  const detector = new CollisionDetector({
    assignments,
    timeSlots: opts?.timeSlots || [],
    seasonMode: opts?.seasonMode || 'normal',
    classes: classesFromAssignments(assignments),
  })
  return dedupeConflictsFromMap(detector.detectAllConflicts()).filter(
    (c) =>
      CRITICAL_DOUBLE_TYPES.has(String(c.type)) &&
      (c.severity === 'critical' || c.severity === 'high')
  ).length
}

export function assertNoDuplicateSlots(assignments: Assignment[], context = 'replaceAssignments') {
  if (process.env.NODE_ENV === 'production') return
  const dupes = findDuplicateSlots(assignments)
  if (dupes.length > 0) {
    console.error(`INVARIANT VIOLATION (${context}): duplicate class slots`, dupes)
  }
}
