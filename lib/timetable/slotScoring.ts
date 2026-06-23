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

const MID_DAY_MINUTES = 10 * 60

export function slotTimeMinutes(time: string): number {
  const [h, m] = String(time).split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
  return hh * 60 + mm
}

export type ScoreSlotOptions = {
  slot: TimeSlot
  base: Assignment
  classAssignments: Assignment[]
  /** When true, prefer moving to a different weekday (any-day moves). */
  penalizeSameDay?: boolean
  /** Random 0–15 jitter so tied slots do not always pick Monday period 1. */
  randomJitter?: boolean
}

/** Lower score = better slot (spread across days, mid-day periods, lighter days). */
export function scoreMoveSlot(opts: ScoreSlotOptions): number {
  const { slot, base, classAssignments, penalizeSameDay = true, randomJitter = true } = opts
  const slotMin = slotTimeMinutes(slot.startTime)
  const midDayScore = Math.abs(slotMin - MID_DAY_MINUTES)

  const sameDay = String(slot.dayOfWeek).toLowerCase() === String(base.dayOfWeek).toLowerCase()
  const sameDayPenalty = penalizeSameDay && sameDay ? 50 : 0

  const dayLoad = classAssignments.filter(
    (a) =>
      String(a.dayOfWeek).toLowerCase() === String(slot.dayOfWeek).toLowerCase() &&
      String(a.id) !== String(base.id) &&
      !a.isBreak
  ).length
  const loadPenalty = dayLoad * 20

  const jitter = randomJitter ? Math.random() * 15 : 0

  return sameDayPenalty + midDayScore + loadPenalty + jitter
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

export type RankTeachingSlotsOptions = {
  penalizeSameDay?: boolean
  excludeSameSlot?: boolean
  randomJitter?: boolean
}

export function rankTeachingSlots(
  slots: TimeSlot[],
  base: Assignment,
  classAssignments: Assignment[],
  opts: RankTeachingSlotsOptions = {}
): TimeSlot[] {
  const penalizeSameDay = opts.penalizeSameDay ?? true
  const excludeSameSlot = opts.excludeSameSlot ?? true
  const randomJitter = opts.randomJitter ?? true

  return scoreTeachingSlots(slots, base, classAssignments, {
    penalizeSameDay,
    excludeSameSlot,
    randomJitter,
  })
    .sort(compareScoredSlots)
    .map(({ slot }) => slot)
}

export function scoreTeachingSlots(
  slots: TimeSlot[],
  base: Assignment,
  classAssignments: Assignment[],
  opts: RankTeachingSlotsOptions = {}
): Array<{ slot: TimeSlot; score: number }> {
  const penalizeSameDay = opts.penalizeSameDay ?? true
  const excludeSameSlot = opts.excludeSameSlot ?? true
  const randomJitter = opts.randomJitter ?? true

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
      score: scoreMoveSlot({ slot, base, classAssignments, penalizeSameDay, randomJitter }),
    }))
}
