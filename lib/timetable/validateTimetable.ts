import type { Assignment } from './types'
import {
  buildClassDoubleBookedMessage,
  buildRoomDoubleBookedMessage,
  parseTimeToMinutes,
  roomSlotsOverlap,
  timedSlotsOverlap,
} from './timeRangeOverlap'
import {
  collapseContiguousBlocks,
  detectTeacherClassSessionIssues,
  fragmentFromAssignment,
  normalizeTeacherClassSessionRules,
  type TeacherClassSessionRulesConfig,
  TEACHER_CLASS_RETURN_TOO_SOON,
  TEACHER_CLASS_SUBJECT_SPLIT,
} from './teacherClassSessionRules'
import {
  detectTeacherWorkloadIssues,
  normalizeTeacherWorkloadRules,
  TEACHER_BREAK_OVERLAP,
  TEACHER_CONSECUTIVE_LIMIT,
  TEACHER_DAY_OVERLOAD,
  workloadFragmentFromAssignment,
  type BreakSlotLike,
  type TeacherWorkloadRulesConfig,
} from './teacherWorkloadRules'

export type TimetableConflictType =
  | 'TEACHER_DOUBLE_BOOKED'
  | 'CLASS_DOUBLE_BOOKED'
  | 'ROOM_DOUBLE_BOOKED'
  | typeof TEACHER_CONSECUTIVE_LIMIT
  | typeof TEACHER_DAY_OVERLOAD
  | typeof TEACHER_BREAK_OVERLAP
  | 'SUBJECT_DISTRIBUTION'
  | typeof TEACHER_CLASS_SUBJECT_SPLIT
  | typeof TEACHER_CLASS_RETURN_TOO_SOON

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
  return parseTimeToMinutes(t) ?? 0
}

/**
 * Half-open [start, end) overlap — same semantics as Postgres
 * `timetable_slot_int4range` / EXCLUDE USING gist.
 */
export function timesOverlap(
  a: Pick<Assignment, 'dayOfWeek' | 'startTime' | 'endTime' | 'isBreak' | 'season'>,
  b: Pick<Assignment, 'dayOfWeek' | 'startTime' | 'endTime' | 'isBreak' | 'season'>
) {
  return timedSlotsOverlap(a, b, { respectSeason: false })
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

/** Hard class clash = same class + genuine [start,end) time overlap (matches EXCLUDE). */
function classAssignmentsConflict(a1: Assignment, a2: Assignment): boolean {
  if (String(a1.classId) !== String(a2.classId)) return false
  return timedSlotsOverlap(a1, a2)
}

function teacherAssignmentsConflict(a1: Assignment, a2: Assignment): boolean {
  if (String(a1.teacherId) !== String(a2.teacherId)) return false
  return timedSlotsOverlap(a1, a2)
}

function roomAssignmentsConflict(a1: Assignment, a2: Assignment): boolean {
  return roomSlotsOverlap(a1, a2)
}

function roomLabelFromAssignments(list: Assignment[], classroomId: string): string | undefined {
  const row = list.find((a) => String(a.classroomId) === classroomId)
  if (!row) return undefined
  const name = String((row as Assignment & { classroomName?: string }).classroomName || '').trim()
  return name || undefined
}

/**
 * Matrix validation (FET/aSc-style): hard constraints must be zero before publish.
 * Hard double-bookings are emitted once per overlapping-time cluster, not once per pair.
 * Same-subject-same-day without time overlap is soft SUBJECT_DISTRIBUTION only
 * (class-level distribution). Teacher↔class session Rules A/B are separate types.
 */
export function validateTimetable(
  assignments: Assignment[],
  opts?: {
    /** Default true — rooms with classroomId are checked; null room rows skip. */
    includeRoomChecks?: boolean
    teacherClassSessionRules?: Partial<TeacherClassSessionRulesConfig> | null
    teacherWorkloadRules?: Partial<TeacherWorkloadRulesConfig> | null
    /** Designated break/lunch windows from TimetableConfig.breakSlots. */
    breakSlots?: BreakSlotLike[] | null
  }
): TimetableValidationConflict[] {
  const list = (assignments || []).filter((a) => a && !a.isBreak)
  const conflicts: TimetableValidationConflict[] = []
  const includeRoom = opts?.includeRoomChecks !== false
  const sessionRules = normalizeTeacherClassSessionRules(opts?.teacherClassSessionRules)
  const workloadRules = normalizeTeacherWorkloadRules(
    opts?.teacherWorkloadRules ?? opts?.teacherClassSessionRules
  )
  const breakSlots = Array.isArray(opts?.breakSlots) ? opts!.breakSlots! : []

  for (const group of clusterByLink(list, classAssignmentsConflict)) {
    const classId = String(group[0].classId)
    const sorted = [...group].sort(
      (x, y) =>
        toMinutes(x.startTime) - toMinutes(y.startTime) || String(x.id).localeCompare(String(y.id))
    )
    conflicts.push({
      type: 'CLASS_DOUBLE_BOOKED',
      severity: 'hard',
      message: buildClassDoubleBookedMessage({
        className: classLabelFromAssignments(list, classId),
        dayOfWeek: sorted[0]?.dayOfWeek,
        entries: sorted.map((a) => ({
          subjectName: (a as Assignment & { subjectName?: string }).subjectName,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      }),
      entityId: classId,
      assignmentIds: sorted.map((a) => String(a.id)),
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
      const classroomId = String(group[0].classroomId)
      const sorted = [...group].sort(
        (x, y) =>
          toMinutes(x.startTime) - toMinutes(y.startTime) ||
          String(x.id).localeCompare(String(y.id))
      )
      conflicts.push({
        type: 'ROOM_DOUBLE_BOOKED',
        severity: 'hard',
        message: buildRoomDoubleBookedMessage({
          roomName: roomLabelFromAssignments(list, classroomId),
          dayOfWeek: sorted[0]?.dayOfWeek,
          entries: sorted.map((a) => ({
            className: (a as Assignment & { className?: string }).className,
            subjectName: (a as Assignment & { subjectName?: string }).subjectName,
            startTime: a.startTime,
            endTime: a.endTime,
          })),
        }),
        entityId: classroomId,
        assignmentIds: sorted.map((a) => String(a.id)),
      })
    }
  }

  // Teacher workload: day load, consecutive runs, break/lunch overlap
  const workloadFrags = list
    .map((a) =>
      workloadFragmentFromAssignment({
        ...a,
        teacherName: (a as Assignment & { teacherName?: string }).teacherName,
      })
    )
    .filter(Boolean) as ReturnType<typeof workloadFragmentFromAssignment>[]
  for (const issue of detectTeacherWorkloadIssues(
    workloadFrags as NonNullable<ReturnType<typeof workloadFragmentFromAssignment>>[],
    workloadRules,
    breakSlots
  )) {
    conflicts.push({
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      entityId: issue.entityId,
      assignmentIds: issue.assignmentIds,
    })
  }

  // Teacher↔class session rules (A: non-contiguous same subject; B: different-subject min gap)
  const sessionFrags = list
    .map((a) =>
      fragmentFromAssignment({
        ...a,
        subjectName: (a as Assignment & { subjectName?: string }).subjectName,
        className: (a as Assignment & { className?: string }).className,
        teacherName: (a as Assignment & { teacherName?: string }).teacherName,
      })
    )
    .filter(Boolean)
  for (const issue of detectTeacherClassSessionIssues(sessionFrags as any, sessionRules)) {
    conflicts.push({
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      entityId: issue.entityId,
      assignmentIds: issue.assignmentIds,
    })
  }

  // Soft: same subject twice on one day for a class (uneven distribution hint).
  // Skip continuous blocks and cases already covered by Rule A.
  const byClassSubjectDay = new Map<string, number>()
  for (const a of list) {
    const k = `${a.classId}|${a.subjectId}|${a.dayOfWeek}`
    byClassSubjectDay.set(k, (byClassSubjectDay.get(k) || 0) + 1)
  }
  for (const [k, count] of byClassSubjectDay) {
    if (count < 2) continue
    const [classId, subjectId, day] = k.split('|')
    const rows = list.filter(
      (a) =>
        String(a.classId) === classId &&
        String(a.subjectId) === subjectId &&
        String(a.dayOfWeek) === day
    )
    const ids = rows.map((a) => String(a.id))
    const alreadyCovered = conflicts.some(
      (c) =>
        (c.type === 'CLASS_DOUBLE_BOOKED' || c.type === TEACHER_CLASS_SUBJECT_SPLIT) &&
        ids.some((id) => c.assignmentIds.includes(id))
    )
    if (alreadyCovered) continue

    const frags = rows
      .map((a) =>
        fragmentFromAssignment({
          ...a,
          subjectName: (a as Assignment & { subjectName?: string }).subjectName,
          className: (a as Assignment & { className?: string }).className,
          teacherName: (a as Assignment & { teacherName?: string }).teacherName,
        })
      )
      .filter(Boolean)
    if (frags.length >= 2 && collapseContiguousBlocks(frags as any).length <= 1) continue

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
