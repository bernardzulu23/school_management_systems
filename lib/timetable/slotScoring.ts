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
const IDEAL_PERIOD = 4

export type PlacedPeriodLite = {
  teacherId: string
  day: string
  startPeriod: number
  startMin?: number
  classId?: string
  subjectId?: string
}

function normDay(day: string) {
  return String(day || '')
    .trim()
    .toLowerCase()
}

function deterministicJitter(seed: number): number {
  const x = Math.sin(seed) * 10000
  return (x - Math.floor(x)) * 12
}

export function lessonJitterSeed(teacherId: string, subjectId: string): number {
  const t = String(teacherId || '').charCodeAt(0) || 0
  const s = String(subjectId || '').charCodeAt(0) || 0
  return t + s
}

export function teacherUsedPeriodNumbers(
  placed: PlacedPeriodLite[],
  teacherId: string
): Set<number> {
  return new Set(
    placed
      .filter((p) => String(p.teacherId) === String(teacherId))
      .map((p) => Number(p.startPeriod))
      .filter((n) => Number.isFinite(n) && n > 0)
  )
}

/** Fisher–Yates shuffle with a deterministic seed (different per restart/block). */
export function shuffleArraySeeded<T>(items: T[], seedBase: number, salt = 0): void {
  for (let i = items.length - 1; i > 0; i--) {
    const seed = (seedBase * 9973 + i * 7919 + salt) >>> 0
    const j = seed % (i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

export function greedyStartIndexScore(opts: {
  basePreference: number
  period: number
  teacherAssignedPeriods: Set<number>
  jitterSeed: number
}): number {
  const { basePreference, period, teacherAssignedPeriods, jitterSeed } = opts
  const spreadPenalty = teacherAssignedPeriods.has(period) ? 8 : 0
  const jitter = ((jitterSeed * period * 2654435761) >>> 0) % 7
  return basePreference + spreadPenalty + jitter
}

export type ScoreSchedulerPlacementOptions = {
  teacherId: string
  classId?: string
  subjectId?: string
  day: string
  startPeriod: number
  placed?: PlacedPeriodLite[]
  startMin?: number
  /** When true, add small pseudo-random tie-break (use jitterSeed for stable restarts). */
  randomJitter?: boolean
  jitterSeed?: number
}

/** Penalty for stacking lessons on the same weekday (spread across Mon–Fri). */
export function scoreDaySpreadComponent(opts: {
  teacherId: string
  classId?: string
  subjectId?: string
  day: string
  placed: PlacedPeriodLite[]
}): number {
  const { teacherId, classId, subjectId, day, placed } = opts
  const nd = normDay(day)
  const teacherPlaced = placed.filter((p) => String(p.teacherId) === String(teacherId))

  const sameDayCount = teacherPlaced.filter((p) => normDay(p.day) === nd).length
  let penalty = sameDayCount * 85

  if (classId && subjectId) {
    const csSameDay = teacherPlaced.filter(
      (p) =>
        normDay(p.day) === nd &&
        String(p.classId || '') === String(classId) &&
        String(p.subjectId || '') === String(subjectId)
    ).length
    if (csSameDay > 0) return 1_000_000
  }

  const distinctDays = new Set(teacherPlaced.map((p) => normDay(p.day)).filter(Boolean)).size
  if (sameDayCount === 0 && distinctDays > 0) {
    penalty -= 30
  }

  return penalty
}

/**
 * Lower score = better placement. Spreads teachers across weekdays and period numbers.
 */
export function scoreSchedulerPlacement(opts: ScoreSchedulerPlacementOptions): number {
  const {
    teacherId,
    classId,
    subjectId,
    day,
    startPeriod,
    placed = [],
    startMin,
    randomJitter = true,
    jitterSeed = 0,
  } = opts

  const nd = normDay(day)
  const teacherPlaced = placed.filter((p) => String(p.teacherId) === String(teacherId))

  const daySpreadPenalty = scoreDaySpreadComponent({
    teacherId,
    classId,
    subjectId,
    day,
    placed,
  })

  const samePeriodOtherDays = teacherPlaced.filter(
    (p) => normDay(p.day) !== nd && Number(p.startPeriod) === startPeriod
  ).length
  const periodRepeatPenalty = samePeriodOtherDays * 90

  const periodUsage = new Map<number, number>()
  for (const p of teacherPlaced) {
    const pn = Number(p.startPeriod) || 0
    periodUsage.set(pn, (periodUsage.get(pn) || 0) + 1)
  }
  const usagePenalty = (periodUsage.get(startPeriod) || 0) * 50

  const periodNum = Number(startPeriod) || 0
  const earlyPeriodPenalty =
    periodNum === 1 ? 60 : periodNum === 2 ? 38 : periodNum === 3 ? 18 : periodNum === 4 ? 6 : 0

  const periodMidPenalty = Math.abs(periodNum - IDEAL_PERIOD) * 10

  const timeMidPenalty =
    startMin != null && Number.isFinite(startMin)
      ? Math.abs(Number(startMin) - MID_DAY_MINUTES) * 0.03
      : 0

  const dayRank = DAY_RANK[nd] ?? 7
  const jitter = randomJitter ? deterministicJitter(jitterSeed + periodNum * 17 + dayRank * 31) : 0

  return (
    daySpreadPenalty +
    periodRepeatPenalty +
    usagePenalty +
    earlyPeriodPenalty +
    periodMidPenalty +
    timeMidPenalty +
    jitter
  )
}

export function compareSchedulerPlacements(
  a: ScoreSchedulerPlacementOptions,
  b: ScoreSchedulerPlacementOptions
): number {
  const scoreA = scoreSchedulerPlacement(a)
  const scoreB = scoreSchedulerPlacement(b)
  if (scoreA !== scoreB) return scoreA - scoreB
  const da = DAY_RANK[normDay(a.day)] ?? 99
  const db = DAY_RANK[normDay(b.day)] ?? 99
  if (da !== db) return da - db
  return a.startPeriod - b.startPeriod
}

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

  const sameSubjectSameDay = classAssignments.some(
    (a) =>
      String(a.id) !== String(base.id) &&
      !a.isBreak &&
      String(a.subjectId) === String(base.subjectId) &&
      String(a.dayOfWeek).toLowerCase() === String(slot.dayOfWeek).toLowerCase()
  )
  const sameSubjectPenalty = sameSubjectSameDay ? 1_000_000 : 0

  const dayLoad = classAssignments.filter(
    (a) =>
      String(a.dayOfWeek).toLowerCase() === String(slot.dayOfWeek).toLowerCase() &&
      String(a.id) !== String(base.id) &&
      !a.isBreak
  ).length
  const loadPenalty = dayLoad * 20

  const periodNum = Number(slot.period) || 0
  const earlyPeriodPenalty = periodNum === 1 ? 35 : periodNum === 2 ? 12 : 0

  const dayKey = String(slot.dayOfWeek).toLowerCase()
  const mondayPenalty = dayKey === 'monday' && penalizeSameDay ? 8 : 0

  const jitter = randomJitter ? Math.random() * 15 : 0

  return (
    sameDayPenalty +
    sameSubjectPenalty +
    midDayScore +
    loadPenalty +
    earlyPeriodPenalty +
    mondayPenalty +
    jitter
  )
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
