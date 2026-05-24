/** Double-period span helpers (assignment + TimeSlot.isDouble). */

import { normalizeTime, timeToMin } from '@/lib/timetable/gridHelpers'

export function assignmentIsDouble(assignment) {
  if (!assignment) return false
  if (assignment.isDoublePeriod === true) return true
  const cp = Number(assignment.consecutivePeriods)
  if (Number.isFinite(cp) && cp >= 2) return true
  const pt = String(assignment.periodType || '').toLowerCase()
  return pt === 'double' || pt.includes('double')
}

export function slotRowSpanFromIsDouble(slot, bellRows) {
  if (!slot || slot.isBreak || !slot.isDouble) return 1
  return 2
}

export function effectiveAssignmentSpan(assignment, bellRows) {
  if (!assignment) return 1
  let span = Math.max(1, Number(assignment.consecutivePeriods) || 1)
  if (assignmentIsDouble(assignment)) span = Math.max(2, span)

  const startIdx = (bellRows || []).findIndex(
    (r) => !r.isBreak && normalizeTime(r.startTime) === normalizeTime(assignment.startTime)
  )
  if (startIdx >= 0 && bellRows[startIdx]?.isDouble) {
    span = Math.max(span, 2)
  }

  let overlapSpan = 0
  for (const row of bellRows || []) {
    if (row.isBreak) continue
    const s0 = timeToMin(row.startTime)
    const s1 = timeToMin(row.endTime)
    const a0 = timeToMin(assignment.startTime)
    const a1 = timeToMin(assignment.endTime)
    if (a0 < s1 && s0 < a1) overlapSpan += 1
  }

  if (startIdx >= 0 && span > 1) {
    let teachableSpan = 0
    for (let i = startIdx; i < bellRows.length && teachableSpan < span; i++) {
      if (bellRows[i].isBreak) break
      teachableSpan += 1
    }
    return Math.max(1, Math.max(overlapSpan, teachableSpan))
  }

  return Math.max(1, overlapSpan || span)
}

export function inferAssignmentDoubleFields(entry) {
  const periodType = String(entry?.periodType || '').toLowerCase()
  const durationMin = Number(entry?.durationMin || 0)
  const isDoublePeriod =
    periodType === 'double' || periodType.includes('double') || durationMin >= 70
  const consecutivePeriods = isDoublePeriod ? 2 : 1
  return { isDoublePeriod, consecutivePeriods, periodType: entry?.periodType || null }
}
