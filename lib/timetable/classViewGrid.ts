import type { Assignment, TimeSlot } from '@/lib/timetable/types'

export const CLASS_VIEW_DAYS = [
  { key: 'MON', match: ['monday', 'mon'] },
  { key: 'TUE', match: ['tuesday', 'tue'] },
  { key: 'WED', match: ['wednesday', 'wed'] },
  { key: 'THU', match: ['thursday', 'thu'] },
  { key: 'FRI', match: ['friday', 'fri'] },
] as const

export type ClassViewDayKey = (typeof CLASS_VIEW_DAYS)[number]['key']

export function dayToShortLabel(day: string): ClassViewDayKey | null {
  const d = String(day || '')
    .trim()
    .toLowerCase()
  for (const row of CLASS_VIEW_DAYS) {
    if (row.match.includes(d as (typeof row.match)[number])) return row.key
  }
  const slice = d.slice(0, 3).toUpperCase()
  return CLASS_VIEW_DAYS.some((x) => x.key === slice) ? (slice as ClassViewDayKey) : null
}

export function assignmentGridKey(
  assignment: Assignment,
  timeSlots: TimeSlot[] = []
): string | null {
  const day = dayToShortLabel(String(assignment.dayOfWeek || ''))
  if (!day) return null

  let period = Number(assignment.period)
  const slotId = assignment.timeSlotId
  if (slotId != null && timeSlots.length) {
    const slot = timeSlots.find((s) => String(s.id) === String(slotId))
    if (slot && !slot.isBreak) period = Number(slot.period) || period
  }
  if (!Number.isFinite(period) || period < 1) return null
  return `${period}|${day}`
}

export function buildClassAssignmentGrid(
  classId: string,
  assignments: Assignment[],
  timeSlots: TimeSlot[] = []
): Map<string, Assignment> {
  const grid = new Map<string, Assignment>()
  for (const a of assignments) {
    if (String(a.classId) !== String(classId) || a.isBreak) continue
    const key = assignmentGridKey(a, timeSlots)
    if (!key) continue
    if (!grid.has(key)) grid.set(key, a)
  }
  return grid
}
