import type { Assignment } from './types'
import { assignmentsShareSlot, assignmentsSameDay } from './constraintCheck'
import { gradeDoubleBookedMessage } from './zambiaTerminology'

export type TimetableConflictType =
  | 'TEACHER_DOUBLE_BOOKED'
  | 'CLASS_DOUBLE_BOOKED'
  | 'ROOM_DOUBLE_BOOKED'
  | 'TEACHER_CONSECUTIVE_LIMIT'
  | 'SUBJECT_DISTRIBUTION'

export type TimetableConflictSeverity = 'hard' | 'soft'

export interface TimetableValidationConflict {
  type: TimetableConflictType
  severity: TimetableConflictSeverity
  message: string
  entityId?: string
  assignmentIds: string[]
}

function classLabelFromAssignments(list: Assignment[], classId: string): string | undefined {
  const row = list.find((a) => String(a.classId) === classId)
  if (!row) return undefined
  const name = String((row as Assignment & { className?: string }).className || '').trim()
  return name || undefined
}

function toMinutes(t: string) {
  const [h, m] = String(t || '0:0')
    .split(':')
    .map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

export function timesOverlap(
  a: Pick<Assignment, 'dayOfWeek' | 'startTime' | 'endTime'>,
  b: Pick<Assignment, 'dayOfWeek' | 'startTime' | 'endTime'>
) {
  if (String(a.dayOfWeek) !== String(b.dayOfWeek)) return false
  const a0 = toMinutes(a.startTime)
  const a1 = toMinutes(a.endTime)
  const b0 = toMinutes(b.startTime)
  const b1 = toMinutes(b.endTime)
  if (a1 <= a0 || b1 <= b0) return false
  return a0 < b1 && b0 < a1
}

/** Union-find clusters so one real clash → one issue (not C(n,2) pair rows). */
function clusterByLink(
  list: Assignment[],
  shouldLink: (a: Assignment, b: Assignment) => boolean
): Assignment[][] {
  const n = list.length
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i])
    return parent[i]
  }
  const unite = (i: number, j: number) => {
    const ri = find(i)
    const rj = find(j)
    if (ri !== rj) parent[rj] = ri
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldLink(list[i], list[j])) unite(i, j)
    }
  }

  const buckets = new Map<number, Assignment[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!buckets.has(root)) buckets.set(root, [])
    buckets.get(root)!.push(list[i])
  }
  return [...buckets.values()].filter((g) => g.length >= 2)
}

function classAssignmentsConflict(a1: Assignment, a2: Assignment): boolean {
  if (String(a1.classId) !== String(a2.classId)) return false
  // Policy: at most one block of a given subject per class per day
  if (String(a1.subjectId) === String(a2.subjectId) && assignmentsSameDay(a1, a2)) return true
  return assignmentsShareSlot(a1, a2, [])
}

function teacherAssignmentsConflict(a1: Assignment, a2: Assignment): boolean {
  if (String(a1.teacherId) !== String(a2.teacherId)) return false
  return assignmentsShareSlot(a1, a2, [])
}

function roomAssignmentsConflict(a1: Assignment, a2: Assignment): boolean {
  if (!a1.classroomId || !a2.classroomId) return false
  if (String(a1.classroomId) !== String(a2.classroomId)) return false
  return assignmentsShareSlot(a1, a2, [])
}

/**
 * Matrix validation (FET/aSc-style): hard constraints must be zero before publish.
 * Hard double-bookings are emitted once per overlapping/same-day cluster, not once per pair.
 */
export function validateTimetable(
  assignments: Assignment[],
  opts?: { includeRoomChecks?: boolean }
): TimetableValidationConflict[] {
  const list = (assignments || []).filter((a) => a && !a.isBreak)
  const conflicts: TimetableValidationConflict[] = []
  const includeRoom = opts?.includeRoomChecks === true

  for (const group of clusterByLink(list, classAssignmentsConflict)) {
    const classId = String(group[0].classId)
    conflicts.push({
      type: 'CLASS_DOUBLE_BOOKED',
      severity: 'hard',
      message: gradeDoubleBookedMessage(classLabelFromAssignments(list, classId)),
      entityId: classId,
      assignmentIds: group.map((a) => String(a.id)),
    })
  }

  for (const group of clusterByLink(list, teacherAssignmentsConflict)) {
    conflicts.push({
      type: 'TEACHER_DOUBLE_BOOKED',
      severity: 'hard',
      message: 'Teacher is double-booked',
      entityId: String(group[0].teacherId),
      assignmentIds: group.map((a) => String(a.id)),
    })
  }

  if (includeRoom) {
    for (const group of clusterByLink(list, roomAssignmentsConflict)) {
      conflicts.push({
        type: 'ROOM_DOUBLE_BOOKED',
        severity: 'hard',
        message: 'Room is double-booked',
        entityId: String(group[0].classroomId),
        assignmentIds: group.map((a) => String(a.id)),
      })
    }
  }

  // Soft: teacher more than 4 consecutive teaching blocks on one day
  const byTeacherDay = new Map<string, Assignment[]>()
  for (const a of list) {
    const key = `${a.teacherId}|${a.dayOfWeek}`
    if (!byTeacherDay.has(key)) byTeacherDay.set(key, [])
    byTeacherDay.get(key)!.push(a)
  }
  for (const [key, dayList] of byTeacherDay) {
    const sorted = [...dayList].sort((x, y) => toMinutes(x.startTime) - toMinutes(y.startTime))
    let run = 1
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = toMinutes(sorted[i - 1].endTime)
      const curStart = toMinutes(sorted[i].startTime)
      if (curStart <= prevEnd + 5) run += 1
      else run = 1
      if (run > 4) {
        conflicts.push({
          type: 'TEACHER_CONSECUTIVE_LIMIT',
          severity: 'soft',
          message: 'Teacher has more than 4 consecutive periods without a break',
          entityId: key.split('|')[0],
          assignmentIds: sorted.slice(Math.max(0, i - 3), i + 1).map((a) => String(a.id)),
        })
        break
      }
    }
  }

  // Soft: same subject twice on one day for a class (uneven distribution hint)
  const byClassSubjectDay = new Map<string, number>()
  for (const a of list) {
    const k = `${a.classId}|${a.subjectId}|${a.dayOfWeek}`
    byClassSubjectDay.set(k, (byClassSubjectDay.get(k) || 0) + 1)
  }
  for (const [k, count] of byClassSubjectDay) {
    if (count < 2) continue
    const [classId, subjectId, day] = k.split('|')
    const ids = list
      .filter(
        (a) =>
          String(a.classId) === classId &&
          String(a.subjectId) === subjectId &&
          String(a.dayOfWeek) === day
      )
      .map((a) => String(a.id))
    const alreadyHard = conflicts.some(
      (c) =>
        c.type === 'CLASS_DOUBLE_BOOKED' &&
        c.severity === 'hard' &&
        ids.every((id) => c.assignmentIds.includes(id))
    )
    if (alreadyHard) continue
    conflicts.push({
      type: 'SUBJECT_DISTRIBUTION',
      severity: 'soft',
      message: `Subject appears ${count} times on ${day} for this class`,
      entityId: classId,
      assignmentIds: ids,
    })
  }

  return conflicts
}

/** Collapse identical residual rows (defensive; clusters should already be unique). */
export function dedupeValidationConflicts(
  conflicts: TimetableValidationConflict[]
): TimetableValidationConflict[] {
  const seen = new Set<string>()
  const out: TimetableValidationConflict[] = []
  for (const c of conflicts || []) {
    const key = `${c.type}|${c.severity}|${c.entityId || ''}|${[...(c.assignmentIds || [])].sort().join(',')}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export function getHardConflicts(conflicts: TimetableValidationConflict[]) {
  return conflicts.filter((c) => c.severity === 'hard')
}

export function getSoftConflicts(conflicts: TimetableValidationConflict[]) {
  return conflicts.filter((c) => c.severity === 'soft')
}

export function canPublishTimetable(assignments: Assignment[]) {
  return getHardConflicts(validateTimetable(assignments)).length === 0
}
