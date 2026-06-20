import type { Assignment, Conflict } from './types'
import type { BellScheduleSlot } from './bellSchedule'
import { CollisionDetector, type CollisionDetectorOptions } from './collisionDetector'
import {
  assignmentsForPrimaryCell,
  isContinuationSlot,
  rowSpanForAssignment,
  timeToMin,
} from './gridHelpers'

export type DropPlan =
  | { kind: 'invalid'; conflicts: Conflict[] }
  | { kind: 'noop' }
  | { kind: 'move'; nextA: Assignment }
  | { kind: 'swap'; nextA: Assignment; nextB: Assignment }

export type DragDropDetectorContext = Pick<
  CollisionDetectorOptions,
  'teachers' | 'classrooms' | 'classes' | 'timeSlots' | 'travelingTeacherRoutes' | 'seasonMode'
>

export function dropTargetId(
  dayOfWeek: string,
  slot: Pick<BellScheduleSlot, 'period' | 'startTime'>
) {
  return `${String(dayOfWeek).toLowerCase()}|${slot.period}|${slot.startTime}`
}

export function parseDropTargetId(
  id: string
): { dayOfWeek: string; period: number; startTime: string } | null {
  const parts = String(id).split('|')
  if (parts.length < 3) return null
  const period = Number(parts[1])
  if (!Number.isFinite(period)) return null
  return { dayOfWeek: parts[0], period, startTime: parts[2] }
}

export function findBellSlotForAssignment(assignment: Assignment, bellRows: BellScheduleSlot[]) {
  return bellRows.find(
    (s) => !s.isBreak && s.startTime === assignment.startTime && s.period === assignment.period
  )
}

export function endTimeForSpanAtSlot(
  assignment: Assignment,
  targetSlot: BellScheduleSlot,
  bellRows: BellScheduleSlot[]
): Assignment['endTime'] {
  const span = rowSpanForAssignment(assignment, bellRows)
  if (span <= 1) return targetSlot.endTime as Assignment['endTime']

  const startIdx = bellRows.findIndex(
    (r) => !r.isBreak && r.startTime === targetSlot.startTime && r.period === targetSlot.period
  )
  if (startIdx < 0) return assignment.endTime

  let counted = 0
  let lastEnd = targetSlot.endTime
  for (let i = startIdx; i < bellRows.length && counted < span; i++) {
    const row = bellRows[i]
    if (row.isBreak) break
    lastEnd = row.endTime
    counted += 1
  }
  return lastEnd as Assignment['endTime']
}

export function buildAssignmentAtSlot(
  assignment: Assignment,
  dayOfWeek: string,
  slot: BellScheduleSlot,
  bellRows: BellScheduleSlot[]
): Assignment {
  return {
    ...assignment,
    dayOfWeek: dayOfWeek as Assignment['dayOfWeek'],
    startTime: slot.startTime as Assignment['startTime'],
    endTime: endTimeForSpanAtSlot(assignment, slot, bellRows),
    period: slot.period,
    isBreak: slot.isBreak,
    durationMin: assignment.durationMin,
    periodType: assignment.periodType,
    consecutivePeriods: assignment.consecutivePeriods,
    isDoublePeriod: assignment.isDoublePeriod,
  }
}

export function resolveDropTargetSlot(
  dayOfWeek: string,
  slot: BellScheduleSlot,
  assignments: Assignment[],
  dragId: Assignment['id'],
  bellRows: BellScheduleSlot[]
): BellScheduleSlot {
  const others = assignments.filter((x) => String(x.id) !== String(dragId))
  if (!isContinuationSlot(dayOfWeek, slot, others, bellRows)) return slot

  const covering = others.find(
    (x) =>
      String(x.dayOfWeek).toLowerCase() === String(dayOfWeek).toLowerCase() &&
      timeToMin(x.startTime) < timeToMin(slot.startTime) &&
      timeToMin(x.endTime) > timeToMin(slot.startTime)
  )
  if (!covering) return slot
  const primary = bellRows.find((s) => !s.isBreak && s.startTime === covering.startTime)
  return primary || slot
}

export function findBellSlotByDropId(
  bellRows: BellScheduleSlot[],
  dropId: string
): BellScheduleSlot | null {
  const parsed = parseDropTargetId(dropId)
  if (!parsed) return null
  return (
    bellRows.find(
      (s) => !s.isBreak && s.period === parsed.period && s.startTime === parsed.startTime
    ) || null
  )
}

export function validateAssignmentMove(
  candidate: Assignment,
  assignments: Assignment[],
  ctx: DragDropDetectorContext
): Conflict[] {
  try {
    const detector = new CollisionDetector({
      assignments,
      teachers: ctx.teachers || [],
      classrooms: ctx.classrooms || [],
      classes: ctx.classes || [],
      timeSlots: ctx.timeSlots || [],
      travelingTeacherRoutes: ctx.travelingTeacherRoutes || [],
      seasonMode: ctx.seasonMode,
    })
    return detector.validateAssignment(candidate)
  } catch {
    return []
  }
}

export function planDrop(opts: {
  dragged: Assignment
  targetDay: string
  targetSlot: BellScheduleSlot
  assignments: Assignment[]
  bellRows: BellScheduleSlot[]
  ctx: DragDropDetectorContext
}): DropPlan {
  const { dragged, targetDay, targetSlot, assignments, bellRows, ctx } = opts

  if (targetSlot.isBreak) return { kind: 'invalid', conflicts: [] }

  const resolvedSlot = resolveDropTargetSlot(
    targetDay,
    targetSlot,
    assignments,
    dragged.id,
    bellRows
  )
  const nextA = buildAssignmentAtSlot(dragged, targetDay, resolvedSlot, bellRows)
  const occupants = assignmentsForPrimaryCell(targetDay, resolvedSlot, assignments).filter(
    (x) => String(x.id) !== String(dragged.id)
  )

  const sameSlot =
    String(dragged.dayOfWeek).toLowerCase() === String(targetDay).toLowerCase() &&
    dragged.startTime === resolvedSlot.startTime &&
    dragged.period === resolvedSlot.period
  if (sameSlot) return { kind: 'noop' }

  const aIssues = validateAssignmentMove(nextA, assignments, ctx)
  if (aIssues.length === 0 && occupants.length === 0) {
    return { kind: 'move', nextA }
  }

  if (occupants.length === 1) {
    const b = occupants[0]
    const fromSlot = findBellSlotForAssignment(dragged, bellRows)
    const nextB = fromSlot
      ? buildAssignmentAtSlot(b, String(dragged.dayOfWeek), fromSlot, bellRows)
      : {
          ...b,
          dayOfWeek: dragged.dayOfWeek,
          startTime: dragged.startTime,
          endTime: dragged.endTime,
          period: dragged.period,
          isBreak: false,
        }

    const hypothetical = assignments.map((x) => {
      if (String(x.id) === String(dragged.id)) return nextA
      if (String(x.id) === String(b.id)) return nextB
      return x
    })

    const bIssues = validateAssignmentMove(nextB, hypothetical, ctx)
    const aIssuesAfter = validateAssignmentMove(nextA, hypothetical, ctx)
    if (aIssuesAfter.length === 0 && bIssues.length === 0) {
      return { kind: 'swap', nextA, nextB }
    }
    return {
      kind: 'invalid',
      conflicts: [...aIssuesAfter, ...bIssues],
    }
  }

  return { kind: 'invalid', conflicts: aIssues }
}

export function planDropFromId(opts: {
  draggedId: Assignment['id']
  dropId: string
  assignments: Assignment[]
  bellRows: BellScheduleSlot[]
  ctx: DragDropDetectorContext
}): DropPlan {
  const dragged = opts.assignments.find((a) => String(a.id) === String(opts.draggedId))
  const slot = findBellSlotByDropId(opts.bellRows, opts.dropId)
  const parsed = parseDropTargetId(opts.dropId)
  if (!dragged || !slot || !parsed) return { kind: 'invalid', conflicts: [] }
  return planDrop({
    dragged,
    targetDay: parsed.dayOfWeek,
    targetSlot: slot,
    assignments: opts.assignments,
    bellRows: opts.bellRows,
    ctx: opts.ctx,
  })
}
