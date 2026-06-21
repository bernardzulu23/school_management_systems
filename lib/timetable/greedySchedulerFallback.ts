/**
 * Greedy/backtracking solver fallback for hybrid generation when scheduler backtracking fails.
 */
import { solveTimetable, type SolverPayload } from '@/lib/timetable/greedySolver'
import type { DbTimeSlotRow } from '@/lib/timetable/loadGenerationContext'
import type { LockedSlotReservation } from '@/lib/timetable/preflightFeasibility'
import type { DbConstraintLike, RecipeLikeForRules } from '@/lib/timetable/constraintRules'
import {
  expandAllocationsIntoBlocks,
  normalizeDay,
  type PlacedBlock,
  type SchedulerAllocation,
  type SchedulerBlock,
} from '@/lib/timetable/scheduler'

export function mapGreedyAssignmentsToPlacedBlocks(
  allBlocks: SchedulerBlock[],
  assignments: Record<string, string>,
  slotSpans: Record<string, string[]>,
  dbTimeSlots: DbTimeSlotRow[]
): PlacedBlock[] {
  const slotById = new Map(dbTimeSlots.map((s) => [s.id, s]))
  const placed: PlacedBlock[] = []

  for (const block of allBlocks) {
    const spanIds =
      slotSpans[block.blockId] || (assignments[block.blockId] ? [assignments[block.blockId]] : [])
    if (spanIds.length !== block.span) continue

    const slots = spanIds.map((id) => slotById.get(String(id))).filter(Boolean) as DbTimeSlotRow[]
    if (slots.length !== block.span) continue

    slots.sort((a, b) => a.period - b.period)
    placed.push({
      ...block,
      day: normalizeDay(slots[0].dayOfWeek),
      startPeriod: slots[0].period,
      startMin: 0,
      endMin: 0,
      startTime: slots[0].startTime,
      endTime: slots[slots.length - 1].endTime,
    })
  }

  return placed
}

export function tryGreedySolverPass(opts: {
  allocations: SchedulerAllocation[]
  dbTimeSlots: DbTimeSlotRow[]
  lockedSlots?: LockedSlotReservation[]
  recipes?: RecipeLikeForRules[]
  constraints?: DbConstraintLike[]
  singleMin: number
  maxExecutionMs: number
}): PlacedBlock[] | null {
  if (!opts.dbTimeSlots.length || !opts.allocations.length) return null

  const slots = opts.dbTimeSlots.map((row) => ({
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    period: row.period,
    startTime: row.startTime,
    endTime: row.endTime,
    isBreak: row.isBreak,
  }))

  const slotByDayPeriod = new Map<string, string>()
  for (const slot of slots) {
    if (slot.isBreak) continue
    slotByDayPeriod.set(`${normalizeDay(slot.dayOfWeek)}|${slot.period}`, slot.id)
  }

  const lockedAssignments: Array<{ teacherId: string; slotId: string }> = []
  for (const lock of opts.lockedSlots || []) {
    if (lock.timeSlotId) {
      lockedAssignments.push({ teacherId: lock.teacherId, slotId: lock.timeSlotId })
      continue
    }
    const slotId = slotByDayPeriod.get(`${normalizeDay(lock.day)}|${lock.periodNumber}`)
    if (slotId) lockedAssignments.push({ teacherId: lock.teacherId, slotId })
  }

  const teacherIds = [...new Set(opts.allocations.map((a) => String(a.teacherId)))]
  const classIds = [...new Set(opts.allocations.map((a) => String(a.classId)))]

  const payload: SolverPayload = {
    name: 'hybrid-greedy-fallback',
    maxSolutions: 1,
    teachers: teacherIds.map((id) => ({ id })),
    classes: classIds.map((id) => ({ id, name: id })),
    slots,
    lessons: [],
    constraints: opts.constraints || [],
    lockedAssignments,
    recipes: (opts.recipes || []) as SolverPayload['recipes'],
    teacherAllocations: opts.allocations,
    maxExecutionMs: opts.maxExecutionMs,
  }

  const result = solveTimetable(payload)
  if (!result.stats.assigned) return null

  const allBlocks = expandAllocationsIntoBlocks(opts.allocations)
  const placed = mapGreedyAssignmentsToPlacedBlocks(
    allBlocks,
    result.assignments || {},
    result.slotSpans || {},
    opts.dbTimeSlots
  )

  return placed.length > 0 ? placed : null
}
