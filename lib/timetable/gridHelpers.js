/** Timetable grid: slot overlap, double-period row span, teacher colours. */

export function timeToMin(t) {
  const [h, m] = String(t || '0:0')
    .split(':')
    .map(Number)
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

export function normalizeTime(t) {
  const s = String(t || '').trim()
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (!m) return s
  return `${String(Number(m[1])).padStart(2, '0')}:${String(Number(m[2])).padStart(2, '0')}`
}

function slotIndex(bellRows, slot) {
  return bellRows.findIndex(
    (r) =>
      normalizeTime(r.startTime) === normalizeTime(slot.startTime) &&
      normalizeTime(r.endTime) === normalizeTime(slot.endTime) &&
      Boolean(r.isBreak) === Boolean(slot.isBreak)
  )
}

export function assignmentOverlapsSlot(assignment, day, slot) {
  if (!assignment || slot?.isBreak) return false
  if (String(assignment.dayOfWeek).toLowerCase() !== String(day).toLowerCase()) return false
  const a0 = timeToMin(assignment.startTime)
  const a1 = timeToMin(assignment.endTime)
  const s0 = timeToMin(slot.startTime)
  const s1 = timeToMin(slot.endTime)
  if (a1 <= a0 || s1 <= s0) return false
  return a0 < s1 && s0 < a1
}

export function isPrimarySlotForAssignment(assignment, slot) {
  if (!assignment || !slot || slot.isBreak) return false
  if (normalizeTime(assignment.startTime) === normalizeTime(slot.startTime)) return true
  const aPeriod = Number(assignment.period)
  const sPeriod = Number(slot.period)
  return aPeriod > 0 && sPeriod > 0 && aPeriod === sPeriod
}

function periodTypeMinSpan(assignment) {
  const pt = String(assignment?.periodType || '').toUpperCase()
  if (pt.includes('TRIPLE')) return 3
  if (pt.includes('DOUBLE')) return 2
  return 1
}

/**
 * Count non-break bell rows fully contained in [startTime, endTime).
 * Works with any school period length (40, 45, 50 min, etc.).
 */
export function calcRowSpan(startTime, endTime, bellRows) {
  if (!bellRows?.length) return 1
  const start = timeToMin(startTime)
  const end = timeToMin(endTime)
  if (end <= start) return 1

  let span = 0
  for (const slot of bellRows) {
    if (slot.isBreak) continue
    const sStart = timeToMin(slot.startTime)
    const sEnd = timeToMin(slot.endTime)
    if (sStart >= start && sEnd <= end) span += 1
  }
  return Math.max(1, span)
}

/** How many bell-schedule rows this assignment spans (doubles = 2, triples = 3). */
export function rowSpanForAssignment(assignment, bellRows) {
  if (!assignment || !bellRows?.length) return 1

  const cp = Math.max(1, Number(assignment.consecutivePeriods) || 1)
  const timeSpan = calcRowSpan(assignment.startTime, assignment.endTime, bellRows)
  const typeMin = periodTypeMinSpan(assignment)

  let span = Math.max(cp, timeSpan, typeMin)

  if (assignment.isDoublePeriod === true) {
    span = Math.max(span, 2)
  }

  const startIdx = bellRows.findIndex(
    (r) => !r.isBreak && normalizeTime(r.startTime) === normalizeTime(assignment.startTime)
  )
  if (startIdx >= 0 && bellRows[startIdx]?.isDouble) {
    span = Math.max(span, 2)
  }

  return Math.max(1, span)
}

function assignmentCoversSlotBySpan(assignment, day, slot, bellRows) {
  if (!assignment || slot?.isBreak) return false
  if (String(assignment.dayOfWeek).toLowerCase() !== String(day).toLowerCase()) return false
  const cp = rowSpanForAssignment(assignment, bellRows)
  const startIdx = bellRows.findIndex(
    (r) => !r.isBreak && normalizeTime(r.startTime) === normalizeTime(assignment.startTime)
  )
  const slotIdx = slotIndex(bellRows, slot)
  if (startIdx < 0 || slotIdx < 0) return assignmentOverlapsSlot(assignment, day, slot)
  if (slotIdx === startIdx) return true
  if (cp > 1 && slotIdx > startIdx) {
    let teachable = 0
    for (let i = startIdx; i < bellRows.length && teachable < cp; i++) {
      if (bellRows[i].isBreak) break
      if (i === slotIdx) return true
      teachable += 1
    }
  }
  return assignmentOverlapsSlot(assignment, day, slot)
}

export function isContinuationSlot(day, slot, assignments, bellRows) {
  if (!slot || slot.isBreak) return false
  for (const a of assignments || []) {
    if (!assignmentCoversSlotBySpan(a, day, slot, bellRows)) continue
    if (isPrimarySlotForAssignment(a, slot)) continue
    return true
  }
  return false
}

export function isTeacherContinuationSlot(day, slot, teacherId, assignments, bellRows = []) {
  if (!slot || slot.isBreak) return false
  for (const a of assignments || []) {
    if (String(a.teacherId) !== String(teacherId)) continue
    if (!assignmentCoversSlotBySpan(a, day, slot, bellRows)) continue
    if (isPrimarySlotForAssignment(a, slot)) continue
    return true
  }
  return false
}

export function assignmentsForPrimaryCell(day, slot, assignments) {
  return (assignments || []).filter(
    (a) => assignmentOverlapsSlot(a, day, slot) && isPrimarySlotForAssignment(a, slot)
  )
}

/**
 * Snap assignment start/end times to the school bell schedule by period number.
 * Fixes grids that stay empty when stored times drift from the current config.
 */
export function alignAssignmentsToBellRows(assignments, bellRows) {
  if (!Array.isArray(bellRows) || bellRows.length === 0) return assignments || []

  const teachable = bellRows.filter((r) => r && !r.isBreak)
  const periodToStartIdx = new Map()
  teachable.forEach((row, idx) => {
    const p = Number(row.period)
    if (p > 0 && !periodToStartIdx.has(p)) periodToStartIdx.set(p, idx)
  })

  return (assignments || []).map((a) => {
    const period = Number(a?.period)
    if (!Number.isFinite(period) || period <= 0) return a

    const startIdx = periodToStartIdx.get(period)
    if (startIdx == null || startIdx < 0) return a

    const startRow = teachable[startIdx]
    const span = Math.max(1, Number(a.consecutivePeriods) || 1)
    const endRow = teachable[Math.min(startIdx + span - 1, teachable.length - 1)] || startRow

    const alignedStart = normalizeTime(startRow.startTime)
    const alignedEnd = normalizeTime(endRow.endTime)
    const currentStart = normalizeTime(a.startTime)
    const currentEnd = normalizeTime(a.endTime)

    if (currentStart === alignedStart && currentEnd === alignedEnd) return a

    return {
      ...a,
      startTime: startRow.startTime,
      endTime: endRow.endTime,
    }
  })
}
