import { isConflict } from './constraintCheck'
import type { Assignment, TimeSlot } from './types'

const DAY_ORDER: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

function normalizeDay(day: string) {
  return String(day || 'monday')
    .trim()
    .toLowerCase()
}

function sortTeachingSlots(timeSlots: TimeSlot[]): TimeSlot[] {
  return (timeSlots || [])
    .filter((s) => s && !s.isBreak)
    .sort((a, b) => {
      const da = DAY_ORDER[normalizeDay(String(a.dayOfWeek))] ?? 99
      const db = DAY_ORDER[normalizeDay(String(b.dayOfWeek))] ?? 99
      if (da !== db) return da - db
      return (Number(a.period) || 0) - (Number(b.period) || 0)
    })
}

function withSlot(assignment: Assignment, slot: TimeSlot): Assignment {
  return {
    ...assignment,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    period: Number(slot.period) || assignment.period,
    timeSlotId: slot.id,
  }
}

function countHardConflicts(assignments: Assignment[], timeSlots: TimeSlot[]): number {
  let n = 0
  for (let i = 0; i < assignments.length; i++) {
    if (isConflict(assignments[i], assignments.slice(0, i), timeSlots)) n += 1
  }
  return n
}

export type SolverBacktrackResult = {
  assignments: Assignment[]
  moved: number
  remainingConflicts: number
}

/**
 * Solver-side backtrack: iteratively moves conflicting assignments to free slots
 * using the same hard constraints as generation (`isConflict`).
 */
export function backtrackReassignAssignments(opts: {
  assignments: Assignment[]
  timeSlots?: TimeSlot[]
  maxPasses?: number
}): SolverBacktrackResult {
  const timeSlots = opts.timeSlots || []
  const slots = sortTeachingSlots(timeSlots)
  let current = [...(opts.assignments || [])]
  let moved = 0
  const maxPasses = Math.max(1, Number(opts.maxPasses) || 32)
  const debug = process.env.NODE_ENV !== 'production'
  const initialConflicts = countHardConflicts(current, timeSlots)
  if (debug && initialConflicts > 0) {
    console.log(`[Backtrack] Starting with ${initialConflicts} conflicting assignments`)
  }

  for (let pass = 0; pass < maxPasses; pass++) {
    let progress = false
    const before = countHardConflicts(current, timeSlots)

    for (let i = 0; i < current.length; i++) {
      const row = current[i]
      const others = current.filter((_, j) => j !== i)
      if (!isConflict(row, others, timeSlots)) continue

      let placed = false
      for (const slot of slots) {
        const candidate = withSlot(row, slot)
        if (isConflict(candidate, others, timeSlots)) continue
        current = current.map((a, j) => (j === i ? candidate : a))
        moved += 1
        progress = true
        placed = true
        if (debug) console.log(`[Backtrack] Assignment ${row.id}: MOVED`)
        break
      }
      if (!placed && debug) {
        console.log(`[Backtrack] Assignment ${row.id}: STUCK`)
      }
      if (progress) break
    }

    const after = countHardConflicts(current, timeSlots)
    if (after === 0) break
    if (!progress || after >= before) break
  }

  const remainingConflicts = countHardConflicts(current, timeSlots)
  if (debug && initialConflicts > 0) {
    console.log(`[Backtrack] Final conflicts: ${remainingConflicts} (moved ${moved})`)
  }

  return {
    assignments: current,
    moved,
    remainingConflicts,
  }
}
