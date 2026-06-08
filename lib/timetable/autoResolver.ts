import type { Assignment, TimeSlot } from './types'
import { CollisionDetector } from './collisionDetector'
import { filterClassCentricConflicts } from './classCentric'
import { countUniqueConflicts } from './conflictDedupe'

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

/**
 * Iteratively moves conflicting lessons to free slots (same day, then any day, then swap).
 * Does not invoke full timetable regeneration.
 */
export function autoResolveConflicts(opts: {
  assignments: Assignment[]
  timeSlots?: TimeSlot[]
  seasonMode?: 'normal' | 'planting' | 'harvest'
}): AutoResolveResult {
  let current = [...(opts.assignments || [])]
  let resolvedCount = 0
  let stalePasses = 0

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const detector = new CollisionDetector({
      assignments: current,
      timeSlots: opts.timeSlots,
      seasonMode: opts.seasonMode || 'normal',
    })
    const conflictMap = detector.detectAllConflicts()
    const remaining = countUniqueConflicts(conflictMap)
    if (remaining === 0) break

    const rows: { assignmentId: string; conflict: { type: string } }[] = []
    for (const [assignmentId, list] of conflictMap.entries()) {
      for (const c of filterClassCentricConflicts(list)) {
        rows.push({ assignmentId, conflict: c })
      }
    }
    rows.sort((a, b) => conflictPriority(a.conflict.type) - conflictPriority(b.conflict.type))

    let progress = false
    for (const { assignmentId, conflict } of rows) {
      const fresh = new CollisionDetector({
        assignments: current,
        timeSlots: opts.timeSlots,
        seasonMode: opts.seasonMode || 'normal',
      })
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

  const final = new CollisionDetector({
    assignments: current,
    timeSlots: opts.timeSlots,
    seasonMode: opts.seasonMode || 'normal',
  })

  return {
    assignments: current,
    resolvedCount,
    remainingConflicts: countUniqueConflicts(final.detectAllConflicts()),
  }
}
