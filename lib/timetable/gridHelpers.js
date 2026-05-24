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
  return normalizeTime(assignment.startTime) === normalizeTime(slot.startTime)
}

/** How many bell-schedule rows this assignment spans (doubles = 2). */
export function rowSpanForAssignment(assignment, bellRows) {
  if (!assignment || !bellRows?.length) return 1
  const cp = Math.max(1, Number(assignment.consecutivePeriods) || 1)
  const startIdx = bellRows.findIndex(
    (r) => !r.isBreak && normalizeTime(r.startTime) === normalizeTime(assignment.startTime)
  )

  let overlapSpan = 0
  for (const row of bellRows) {
    if (row.isBreak) continue
    if (assignmentOverlapsSlot(assignment, assignment.dayOfWeek, row)) overlapSpan += 1
  }

  if (startIdx >= 0 && cp > 1) {
    let teachableSpan = 0
    for (let i = startIdx; i < bellRows.length && teachableSpan < cp; i++) {
      if (bellRows[i].isBreak) break
      teachableSpan += 1
    }
    return Math.max(1, Math.max(overlapSpan, teachableSpan))
  }

  return Math.max(1, overlapSpan || cp)
}

function assignmentCoversSlotBySpan(assignment, day, slot, bellRows) {
  if (!assignment || slot?.isBreak) return false
  if (String(assignment.dayOfWeek).toLowerCase() !== String(day).toLowerCase()) return false
  const cp = Math.max(1, Number(assignment.consecutivePeriods) || 1)
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
