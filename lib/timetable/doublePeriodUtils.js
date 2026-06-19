/** Double/triple period span helpers (assignment + TimeSlot.isDouble). */

import { normalizeTime, timeToMin } from '@/lib/timetable/gridHelpers'

export function assignmentIsDouble(assignment) {
  if (!assignment) return false
  if (assignment.isDoublePeriod === true) return true
  const cp = Number(assignment.consecutivePeriods)
  if (Number.isFinite(cp) && cp >= 2) return true
  const pt = String(assignment.periodType || '').toLowerCase()
  return pt === 'double' || pt.includes('double')
}

export function assignmentIsTriple(assignment) {
  if (!assignment) return false
  const cp = Number(assignment.consecutivePeriods)
  if (Number.isFinite(cp) && cp >= 3) return true
  const pt = String(assignment.periodType || '').toLowerCase()
  return pt === 'triple' || pt.includes('triple')
}

export function slotRowSpanFromIsDouble(slot, bellRows) {
  if (!slot || slot.isBreak || !slot.isDouble) return 1
  return 2
}

export function effectiveAssignmentSpan(assignment, bellRows) {
  if (!assignment) return 1
  let span = Math.max(1, Number(assignment.consecutivePeriods) || 1)
  if (assignmentIsTriple(assignment)) span = Math.max(3, span)
  else if (assignmentIsDouble(assignment)) span = Math.max(2, span)

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

/**
 * Infer period span from DB entry fields.
 * @param {object} entry
 * @param {number} [singleMin=40]
 */
export function inferPeriodSpan(entry, singleMin = 40) {
  const pt = String(entry?.periodType || '').toUpperCase()
  const durationMin = Number(entry?.durationMin || 0)
  const single = Math.max(1, Number(singleMin) || 40)

  if (pt === 'TRIPLE' || pt.includes('TRIPLE')) return 3
  if (pt === 'DOUBLE' || pt.includes('DOUBLE')) return 2
  if (durationMin >= single * 2.5) return 3
  if (durationMin >= single * 1.5) return 2
  return 1
}

export function inferAssignmentDoubleFields(entry, singleMin = 40) {
  const consecutivePeriods = inferPeriodSpan(entry, singleMin)
  const periodType =
    entry?.periodType ||
    (consecutivePeriods >= 3 ? 'TRIPLE' : consecutivePeriods >= 2 ? 'DOUBLE' : 'SINGLE')
  const isDoublePeriod = consecutivePeriods >= 2
  return {
    isDoublePeriod,
    consecutivePeriods,
    periodType,
    durationMin: Number(entry?.durationMin) || consecutivePeriods * singleMin,
  }
}

/** Badge label for multi-period cards (2× / 3×). */
export function periodTypeBadge(periodType, span) {
  const pt = String(periodType || '').toUpperCase()
  if (pt.includes('TRIPLE') || span >= 3) return '3×'
  if (pt.includes('DOUBLE') || span >= 2) return '2×'
  return ''
}
