import type { Assignment, DayOfWeek, TimeSlot } from './types'
import { timesOverlap } from './validateTimetable'

function normalizeDay(day: string) {
  return String(day || '')
    .trim()
    .toLowerCase()
    .slice(0, 3)
}

/** Period span for doubles/triples when placing conflict checks. */
export function assignmentSpan(
  assignment: Pick<Assignment, 'consecutivePeriods' | 'periodType' | 'isDoublePeriod'>
) {
  const fromConsecutive = Number(assignment.consecutivePeriods)
  if (Number.isFinite(fromConsecutive) && fromConsecutive >= 1) return fromConsecutive

  const pt = String(assignment.periodType || '').toUpperCase()
  if (pt.includes('TRIPLE')) return 3
  if (pt.includes('DOUBLE') || assignment.isDoublePeriod) return 2
  return 1
}

export function resolveAssignmentSlot(
  assignment: Assignment,
  timeSlots: TimeSlot[] = []
): { day: DayOfWeek; period: number; span: number } | null {
  const span = assignmentSpan(assignment)
  const slotId = assignment.timeSlotId
  if (slotId != null && timeSlots.length > 0) {
    const slot = timeSlots.find((s) => String(s.id) === String(slotId))
    if (slot) {
      return { day: slot.dayOfWeek, period: Number(slot.period) || 1, span }
    }
  }

  if (assignment.dayOfWeek && Number(assignment.period) >= 1) {
    return {
      day: assignment.dayOfWeek,
      period: Number(assignment.period),
      span,
    }
  }

  return null
}

function periodRangesOverlap(
  dayA: string,
  periodA: number,
  spanA: number,
  dayB: string,
  periodB: number,
  spanB: number
) {
  if (normalizeDay(dayA) !== normalizeDay(dayB)) return false
  return periodA < periodB + spanB && periodB < periodA + spanA
}

/**
 * True when two assignments occupy the same teachable window (day + period span or overlapping times).
 */
export function assignmentsShareSlot(
  a: Assignment,
  b: Assignment,
  timeSlots: TimeSlot[] = []
): boolean {
  if (String(a.id) === String(b.id)) return false
  if (a.isBreak || b.isBreak) return false
  if (a.season && b.season && a.season !== b.season) return false

  const slotA = resolveAssignmentSlot(a, timeSlots)
  const slotB = resolveAssignmentSlot(b, timeSlots)
  if (slotA && slotB) {
    if (
      periodRangesOverlap(
        String(slotA.day),
        slotA.period,
        slotA.span,
        String(slotB.day),
        slotB.period,
        slotB.span
      )
    ) {
      return true
    }
  }

  return timesOverlap(a, b)
}

export function assignmentsSameDay(a: Assignment, b: Assignment): boolean {
  return normalizeDay(String(a.dayOfWeek)) === normalizeDay(String(b.dayOfWeek))
}

/**
 * Hard constraint: same teacher + same class on the same day.
 * - Same subject → conflict (only one block per day).
 * - Different subjects → conflict only when period spans overlap.
 */
export function teacherClassSameDayConflict(
  a: Assignment,
  b: Assignment,
  timeSlots: TimeSlot[] = []
): boolean {
  if (String(a.teacherId) !== String(b.teacherId)) return false
  if (String(a.classId) !== String(b.classId)) return false
  if (!assignmentsSameDay(a, b)) return false
  if (String(a.subjectId) === String(b.subjectId)) return true
  return assignmentsShareSlot(a, b, timeSlots)
}

/**
 * Hard constraint checker for placement and post-generation filtering.
 */
export function isConflict(
  assignment: Assignment,
  existingAssignments: Assignment[],
  timeSlots: TimeSlot[] = []
): boolean {
  if (!assignment || assignment.isBreak) return false

  for (const existing of existingAssignments) {
    if (String(existing.id) === String(assignment.id)) continue
    if (existing.isBreak) continue
    if (assignment.season && existing.season && assignment.season !== existing.season) continue

    if (teacherClassSameDayConflict(assignment, existing, timeSlots)) return true

    if (
      String(assignment.classId) === String(existing.classId) &&
      String(assignment.subjectId) === String(existing.subjectId) &&
      assignmentsSameDay(assignment, existing)
    ) {
      return true
    }

    if (!assignmentsShareSlot(assignment, existing, timeSlots)) continue

    if (String(assignment.teacherId) === String(existing.teacherId)) return true
    if (String(assignment.classId) === String(existing.classId)) return true
  }

  return false
}

/** Drop generated rows that violate teacher/class hard constraints (keeps first occurrence). */
export function filterConflictFreeAssignments(
  assignments: Assignment[],
  timeSlots: TimeSlot[] = []
): Assignment[] {
  const placed: Assignment[] = []
  const kept: Assignment[] = []
  for (const assignment of assignments) {
    if (isConflict(assignment, placed, timeSlots)) continue
    placed.push(assignment)
    kept.push(assignment)
  }
  return kept
}

/** Alias used by solver integrations (`hasConflict` naming). */
export { isConflict as hasConflict }

type SchedulerEntryLike = {
  allocationId: string
  teacherId: string
  classId: string
  subjectId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  periodNumber: number
  periodType?: string
  durationMin?: number
}

export function schedulerEntryToAssignment(entry: SchedulerEntryLike, index: number): Assignment {
  const pt = String(entry.periodType || '').toUpperCase()
  const consecutivePeriods = pt.includes('TRIPLE')
    ? 3
    : pt.includes('DOUBLE')
      ? 2
      : Math.max(1, Math.round((entry.durationMin || 40) / 40))

  return {
    id: `gen-${index}-${entry.allocationId}`,
    season: 'normal',
    dayOfWeek: entry.dayOfWeek as Assignment['dayOfWeek'],
    startTime: entry.startTime as Assignment['startTime'],
    endTime: entry.endTime as Assignment['endTime'],
    period: Number(entry.periodNumber) >= 1 ? Number(entry.periodNumber) : 1,
    teacherId: entry.teacherId,
    classId: entry.classId,
    subjectId: entry.subjectId,
    periodType: entry.periodType,
    consecutivePeriods,
    isBreak: false,
  }
}

/** Filter scheduler output before persisting — skips duplicate teacher/class slot rows. */
export function filterConflictFreeSchedulerEntries<T extends SchedulerEntryLike>(
  entries: T[],
  timeSlots: TimeSlot[] = []
): T[] {
  const placed: Assignment[] = []
  const kept: T[] = []
  for (let i = 0; i < entries.length; i++) {
    const assignment = schedulerEntryToAssignment(entries[i], i)
    if (isConflict(assignment, placed, timeSlots)) continue
    placed.push(assignment)
    kept.push(entries[i])
  }
  return kept
}
