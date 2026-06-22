import type { Assignment, TimeSlot } from './types'
import { CollisionDetector } from './collisionDetector'
import { filterClassCentricConflicts } from './classCentric'
import { countUniqueConflicts } from './conflictDedupe'
import { backtrackReassignAssignments } from './solverBacktrackResolve'

export type AutoResolveResult = {
  assignments: Assignment[]
  resolvedCount: number
  remainingConflicts: number
}

const MAX_PASSES = 24

function conflictPriority(type: string): number {
  if (type === 'ClassDoubleBooked') return 0
  if (type === 'TeacherDoubleBooked') return 1
  return 2
}

function buildConflictRows(conflictMap: Map<string, { type: string }[]>) {
  const rows: { assignmentId: string; conflict: { type: string } }[] = []
  for (const [assignmentId, list] of conflictMap.entries()) {
    for (const c of filterClassCentricConflicts(list)) {
      rows.push({ assignmentId, conflict: c })
    }
  }
  rows.sort((a, b) => conflictPriority(a.conflict.type) - conflictPriority(b.conflict.type))
  return rows
}

function detectorFor(
  assignments: Assignment[],
  timeSlots?: TimeSlot[],
  seasonMode?: 'normal' | 'planting' | 'harvest'
) {
  return new CollisionDetector({
    assignments,
    timeSlots,
    seasonMode: seasonMode || 'normal',
  })
}

/**
 * Iteratively moves conflicting lessons to free slots (same day, then any day, then swap).
 * Rebuilds the collision detector after each applied suggestion so later moves see updated state.
 */
export function autoResolveConflicts(opts: {
  assignments: Assignment[]
  timeSlots?: TimeSlot[]
  seasonMode?: 'normal' | 'planting' | 'harvest'
}): AutoResolveResult {
  const backtrack = backtrackReassignAssignments({
    assignments: opts.assignments,
    timeSlots: opts.timeSlots,
  })

  let current = backtrack.assignments
  let resolvedCount = backtrack.moved
  let stalePasses = 0

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const snapshot = detectorFor(current, opts.timeSlots, opts.seasonMode)
    const conflictMap = snapshot.detectAllConflicts()
    const remaining = countUniqueConflicts(conflictMap)
    if (remaining === 0) break

    const rows = buildConflictRows(conflictMap)
    let progress = false

    for (const { conflict } of rows) {
      const fresh = detectorFor(current, opts.timeSlots, opts.seasonMode)
      const suggestions = fresh.suggestAlternatives(conflict as any)
      if (!suggestions.length) continue

      const best = suggestions.sort((a, b) => b.costReduction - a.costReduction)[0]
      current = best.apply()
      resolvedCount++
      progress = true
      break
    }

    if (!progress) {
      stalePasses++
      if (stalePasses >= 2) break
    } else {
      stalePasses = 0
    }
  }

  const final = detectorFor(current, opts.timeSlots, opts.seasonMode)

  return {
    assignments: current,
    resolvedCount,
    remainingConflicts: countUniqueConflicts(final.detectAllConflicts()),
  }
}
