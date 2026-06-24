import {
  normalizeWorkingDays,
  parseBreakSlots,
  timeToMin,
  minToTime,
} from '@/lib/timetable/timeSlotsFromConfig'
import type { DayPeriodSlot } from '@/lib/timetable/scheduler'

export function buildDaySlotsFromTimetableConfig(
  config: {
    startTime?: string | null
    endTime?: string | null
    singleDuration?: number | null
    breakSlots?: unknown
    workingDays?: unknown
  },
  workingDaysOverride?: string[]
): Record<string, DayPeriodSlot[]> {
  const startTime = String(config?.startTime || '07:30')
  const endTime = String(config?.endTime || '15:30')
  const singleMin = Math.max(1, Number(config?.singleDuration) || 40)
  const breakSlots = parseBreakSlots(config?.breakSlots)
  const workingDays = workingDaysOverride?.length
    ? workingDaysOverride
    : normalizeWorkingDays(config?.workingDays)

  const startMin = timeToMin(startTime)
  const endMin = timeToMin(endTime)

  const breaks = (breakSlots || []).map((b) => ({
    start: timeToMin(String(b.start)),
    end: timeToMin(String(b.end)),
    label: b.label,
    isLunch: Boolean(b.isLunch),
  }))

  const daySlots: Record<string, DayPeriodSlot[]> = {}
  for (const day of workingDays) {
    const slots: DayPeriodSlot[] = []
    let cursor = startMin
    let periodNum = 1

    while (cursor < endMin) {
      const inBreak = breaks.find((b) => cursor >= b.start && cursor < b.end)
      if (inBreak) {
        slots.push({
          type: 'break',
          label: inBreak.label,
          start: inBreak.start,
          end: inBreak.end,
          isLunch: inBreak.isLunch,
          periodNumber: 0,
          startTime: minToTime(inBreak.start),
          endTime: minToTime(inBreak.end),
          durationMin: inBreak.end - inBreak.start,
          day,
        })
        cursor = inBreak.end
        continue
      }

      const nextBreak = breaks.find((b) => b.start > cursor)
      const ceilMin = nextBreak ? Math.min(endMin, nextBreak.start) : endMin

      if (cursor + singleMin <= ceilMin) {
        slots.push({
          type: 'period',
          periodNumber: periodNum,
          start: cursor,
          end: cursor + singleMin,
          startTime: minToTime(cursor),
          endTime: minToTime(cursor + singleMin),
          durationMin: singleMin,
          day,
        })
        cursor += singleMin
        periodNum++
      } else {
        cursor = nextBreak ? nextBreak.start : endMin
      }
    }

    daySlots[day] = slots
  }

  return daySlots
}
