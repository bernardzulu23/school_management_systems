import type { Assignment, TimeSlot } from './types'

const DAY_RANK: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

export function slotTimeMinutes(time: string): number {
  const [h, m] = String(time).split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
  return hh * 60 + mm
}

/** Stable jitter so equal scores do not always pick Monday period 1. */
function slotJitter(slot: TimeSlot, baseId: string): number {
  const seed = `${baseId}|${slot.dayOfWeek}|${slot.period}|${slot.startTime}`
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000
  return (h % 150) / 10
}

export type ScoreSlotOptions = {
  slot: TimeSlot
  base: Assignment
  classAssignments: Assignment[]
  /** When true, prefer moving to a different weekday (any-day moves). */
  penalizeSameDay?: boolean
}

/** Lower score = better slot (spread across days, mid-day periods, lighter days). */
export function scoreMoveSlot(opts: ScoreSlotOptions): number {
  const { slot, base, classAssignments, penalizeSameDay = true } = opts
  const slotMin = slotTimeMinutes(slot.startTime)
  const midDayScore = Math.abs(slotMin - slotTimeMinutes('10:00'))

  const sameDay = String(slot.dayOfWeek).toLowerCase() === String(base.dayOfWeek).toLowerCase()
  const sameDayPenalty = penalizeSameDay && sameDay ? 50 : 0

  const dayLoad = classAssignments.filter(
    (a) =>
      String(a.dayOfWeek).toLowerCase() === String(slot.dayOfWeek).toLowerCase() &&
      String(a.id) !== String(base.id) &&
      !a.isBreak
  ).length
  const loadPenalty = dayLoad * 20

  return sameDayPenalty + midDayScore + loadPenalty + slotJitter(slot, String(base.id))
}

export function compareScoredSlots(
  a: { slot: TimeSlot; score: number },
  b: { slot: TimeSlot; score: number }
): number {
  if (a.score !== b.score) return a.score - b.score
  const da = DAY_RANK[String(a.slot.dayOfWeek).toLowerCase()] ?? 99
  const db = DAY_RANK[String(b.slot.dayOfWeek).toLowerCase()] ?? 99
  if (da !== db) return da - db
  return a.slot.period - b.slot.period
}

export function rankTeachingSlots(
  slots: TimeSlot[],
  base: Assignment,
  classAssignments: Assignment[],
  opts: { penalizeSameDay?: boolean; excludeSameSlot?: boolean } = {}
): TimeSlot[] {
  const penalizeSameDay = opts.penalizeSameDay ?? true
  const excludeSameSlot = opts.excludeSameSlot ?? true

  return slots
    .filter((slot) => {
      if (slot.isBreak) return false
      if (!excludeSameSlot) return true
      return !(
        String(slot.dayOfWeek).toLowerCase() === String(base.dayOfWeek).toLowerCase() &&
        slot.startTime === base.startTime &&
        slot.endTime === base.endTime
      )
    })
    .map((slot) => ({
      slot,
      score: scoreMoveSlot({ slot, base, classAssignments, penalizeSameDay }),
    }))
    .sort(compareScoredSlots)
    .map(({ slot }) => slot)
}
