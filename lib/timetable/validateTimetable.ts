import type { Assignment } from './types'

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

const HARD_TYPES = new Set<TimetableConflictType>([
  'TEACHER_DOUBLE_BOOKED',
  'CLASS_DOUBLE_BOOKED',
  'ROOM_DOUBLE_BOOKED',
])

/**
 * Matrix validation (FET/aSc-style): hard constraints must be zero before publish.
 */
export function validateTimetable(
  assignments: Assignment[],
  opts?: { includeRoomChecks?: boolean }
): TimetableValidationConflict[] {
  const list = (assignments || []).filter((a) => a && !a.isBreak)
  const conflicts: TimetableValidationConflict[] = []
  const includeRoom = opts?.includeRoomChecks === true

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a1 = list[i]
      const a2 = list[j]
      if (!timesOverlap(a1, a2)) continue

      if (String(a1.teacherId) === String(a2.teacherId)) {
        conflicts.push({
          type: 'TEACHER_DOUBLE_BOOKED',
          severity: 'hard',
          message: 'Teacher is double-booked',
          entityId: String(a1.teacherId),
          assignmentIds: [String(a1.id), String(a2.id)],
        })
      }
      if (String(a1.classId) === String(a2.classId)) {
        conflicts.push({
          type: 'CLASS_DOUBLE_BOOKED',
          severity: 'hard',
          message: 'Grade is double-booked',
          entityId: String(a1.classId),
          assignmentIds: [String(a1.id), String(a2.id)],
        })
      }
      if (
        includeRoom &&
        a1.classroomId &&
        a2.classroomId &&
        String(a1.classroomId) === String(a2.classroomId)
      ) {
        conflicts.push({
          type: 'ROOM_DOUBLE_BOOKED',
          severity: 'hard',
          message: 'Room is double-booked',
          entityId: String(a1.classroomId),
          assignmentIds: [String(a1.id), String(a2.id)],
        })
      }
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
    if (count >= 2) {
      const [classId, subjectId, day] = k.split('|')
      const ids = list
        .filter(
          (a) =>
            String(a.classId) === classId &&
            String(a.subjectId) === subjectId &&
            String(a.dayOfWeek) === day
        )
        .map((a) => String(a.id))
      conflicts.push({
        type: 'SUBJECT_DISTRIBUTION',
        severity: 'soft',
        message: `Subject appears ${count} times on ${day} for this class`,
        entityId: classId,
        assignmentIds: ids,
      })
    }
  }

  return conflicts
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
