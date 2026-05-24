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
  return Array.from(map.values()).sort((a, b) => {
    const pa = Number(a.period) || 0
    const pb = Number(b.period) || 0
    if (pa !== pb) return pa - pb
    return timeToMin(a.startTime) - timeToMin(b.startTime)
  })
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
