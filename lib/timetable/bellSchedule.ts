/**
 * Bell schedule helpers — one row per period/break for grid UIs (Mon–Fri share the same times).
 */

export type BellScheduleSlot = {
  id?: string
  dayOfWeek: string
  period: number
  startTime: string
  endTime: string
  isBreak: boolean
  isDouble?: boolean
  duration?: number
  label?: string
}

function timeToMin(t: string) {
  const [h, m] = String(t || '0:0')
    .split(':')
    .map(Number)
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

function slotRowKey(s: Pick<BellScheduleSlot, 'period' | 'startTime' | 'endTime' | 'isBreak'>) {
  return `${s.period}|${s.startTime}|${s.endTime}|${s.isBreak ? 1 : 0}`
}

/** Sort bell rows in chronological order (breaks use period 0 — must not sort before P1). */
export function compareBellRows(
  a: Pick<BellScheduleSlot, 'startTime' | 'endTime' | 'period' | 'isBreak'>,
  b: Pick<BellScheduleSlot, 'startTime' | 'endTime' | 'period' | 'isBreak'>
) {
  const ta = timeToMin(a.startTime)
  const tb = timeToMin(b.startTime)
  if (ta !== tb) return ta - tb
  const ea = timeToMin(a.endTime)
  const eb = timeToMin(b.endTime)
  if (ea !== eb) return ea - eb
  if (Boolean(a.isBreak) !== Boolean(b.isBreak)) return a.isBreak ? 1 : -1
  return (Number(a.period) || 0) - (Number(b.period) || 0)
}

/** Unique period/break rows sorted by start time (for table body). */
export function uniqueBellRows(slots: BellScheduleSlot[]): BellScheduleSlot[] {
  const map = new Map<string, BellScheduleSlot>()
  for (const s of slots || []) {
    if (!s) continue
    const key = slotRowKey(s)
    if (!map.has(key)) {
      map.set(key, {
        id: s.id,
        dayOfWeek: 'monday',
        period: Number(s.period) || 0,
        startTime: String(s.startTime || '08:00'),
        endTime: String(s.endTime || '08:40'),
        isBreak: Boolean(s.isBreak),
        isDouble: Boolean(s.isDouble),
        duration: s.duration != null ? Number(s.duration) : undefined,
        label: s.label,
      })
    }
  }
  return Array.from(map.values()).sort(compareBellRows)
}

export function normalizeApiTimeSlots(raw: unknown[]): BellScheduleSlot[] {
  return (raw || []).map((s: any) => ({
    id: s?.id ? String(s.id) : undefined,
    dayOfWeek: String(s?.dayOfWeek || 'monday').toLowerCase(),
    period: Number(s?.period) || 0,
    startTime: String(s?.startTime || '08:00'),
    endTime: String(s?.endTime || '08:40'),
    isBreak: Boolean(s?.isBreak),
    isDouble: Boolean(s?.isDouble),
    duration: s?.duration != null ? Number(s.duration) : undefined,
    label: s?.label || s?.breakName || undefined,
  }))
}
