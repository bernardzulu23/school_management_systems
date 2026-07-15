/**
 * Zambian secondary timetable scheduler — greedy + backtracking.
 *
 * Hard constraints (never violated):
 *  1. Teacher cannot teach two grades at the same time.
 *  2. Grade cannot have two subjects at the same time.
 *  3. Teacher↔class session rules (shared with audit): non-contiguous same-subject
 *     split (Rule A); different-subject return closer than configured min gap (Rule B).
 *
 * Soft constraints (optional during search via strictSoftConstraints):
 *  - Same subject twice on same day for same grade (prefer spread)
 *  - Two multi-period blocks of the same class+subject on the same day
 *  - Teacher daily period cap
 *  - Prefer spreading teacher doubles across weekdays (not a hard block)
 */

import {
  expandAllocationToUnits,
  expandAllocationToUnitsForAllClasses,
  type AllocationLike,
} from '@/lib/timetable/periodExpansion'
import { interleaveBlocks, compareDaySpread } from '@/lib/timetable/lessonOrdering'
import {
  scoreSchedulerPlacement,
  shuffleArraySeeded,
  slotTimeMinutes,
  type PlacedPeriodLite,
} from '@/lib/timetable/slotScoring'
import {
  buildRecipePlacementRules,
  buildTeacherDbConstraintRules,
  getLessonPlacementRule,
  isSlotForbidden,
  placementPreferenceScore,
  type DbConstraintLike,
  type PlacementRule,
  type RecipeLikeForRules,
} from '@/lib/timetable/constraintRules'
import type { LockedSlotReservation } from '@/lib/timetable/preflightFeasibility'
import {
  DEFAULT_TEACHER_CLASS_SESSION_RULES,
  normalizeTeacherClassSessionRules,
  teacherClassSessionPlacementViolation,
  type TeacherClassSessionRulesConfig,
  type SessionFragment,
} from '@/lib/timetable/teacherClassSessionRules'
import {
  DEFAULT_TEACHER_WORKLOAD_RULES,
  normalizeTeacherWorkloadRules,
  teacherWorkloadPlacementViolation,
  type BreakSlotLike,
  type TeacherWorkloadRulesConfig,
  type WorkloadFragment,
} from '@/lib/timetable/teacherWorkloadRules'

/** Default break positions when daySlots cannot be inspected (legacy fallback). */
export const BREAK_AFTER_PERIODS = [2, 5]

const DAY_ORDER: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

export function normalizeDay(day: string): string {
  return String(day || 'monday')
    .trim()
    .toLowerCase()
}

/** Derive period numbers after which a break row follows in the bell schedule grid. */
export function deriveBreakAfterPeriods(daySlots: Record<string, DayPeriodSlot[]>): number[] {
  const dayKey =
    Object.keys(daySlots).find((d) => (daySlots[d] || daySlots[normalizeDay(d)] || []).length) || ''
  if (!dayKey) return [...BREAK_AFTER_PERIODS]

  const slots = daySlots[dayKey] || daySlots[normalizeDay(dayKey)] || []
  const after: number[] = []
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (slot.type !== 'period') continue
    if (slots[i + 1]?.type === 'break') {
      after.push(Number(slot.periodNumber))
    }
  }
  return after.length ? after : [...BREAK_AFTER_PERIODS]
}

export function consecutivePeriodsAreValid(
  startPeriod: number,
  span: number,
  breakAfterPeriods: number[] = BREAK_AFTER_PERIODS
): boolean {
  for (const breakAfter of breakAfterPeriods) {
    if (startPeriod <= breakAfter && startPeriod + span - 1 > breakAfter) {
      return false
    }
  }
  return true
}

/**
 * Shared helper for flat TimeSlot lists (greedySolver) — periods after which a break row follows.
 * Sort by clock time (breaks often use period 0 in DB); fall back to period order.
 */
export function deriveBreakAfterPeriodsFromFlatSlots(
  allSlots: Array<{
    dayOfWeek: string
    period: number
    isBreak?: boolean
    startTime?: string
  }>
): number[] {
  if (!Array.isArray(allSlots) || allSlots.length === 0) return [...BREAK_AFTER_PERIODS]

  const sorted = [...allSlots].sort((a, b) => {
    const da = DAY_ORDER[normalizeDay(a.dayOfWeek)] ?? 99
    const db = DAY_ORDER[normalizeDay(b.dayOfWeek)] ?? 99
    if (da !== db) return da - db
    const ta = slotTimeMinutes(String(a.startTime || ''))
    const tb = slotTimeMinutes(String(b.startTime || ''))
    if (ta !== tb) return ta - tb
    // Teaching periods before break rows that share the same timestamp/period bucket
    if (Boolean(a.isBreak) !== Boolean(b.isBreak)) return a.isBreak ? 1 : -1
    return (Number(a.period) || 0) - (Number(b.period) || 0)
  })

  const breakAfter = new Set<number>()
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]
    const next = sorted[i + 1]
    if (normalizeDay(cur.dayOfWeek) !== normalizeDay(next.dayOfWeek)) continue
    if (cur.isBreak) continue
    if (next.isBreak) breakAfter.add(Number(cur.period) || 0)
  }
  return breakAfter.size > 0 ? [...breakAfter] : [...BREAK_AFTER_PERIODS]
}

/** True when period numbers form a consecutive run that does not cross a break. */
export function isValidPeriodRun(
  startPeriod: number,
  span: number,
  breakAfterPeriods: number[] = BREAK_AFTER_PERIODS
): boolean {
  if (span <= 0) return false
  if (span === 1) return true
  return consecutivePeriodsAreValid(startPeriod, span, breakAfterPeriods)
}

export type DayPeriodSlot = {
  type: 'period' | 'break'
  periodNumber: number
  start: number
  end: number
  startTime: string
  endTime: string
  durationMin: number
  day: string
}

export type SchedulerAllocation = AllocationLike & {
  id: string
  teacher?: { name?: string | null }
  subject?: { name?: string | null }
  class?: { name?: string | null }
}

export type SchedulerBlock = {
  blockId: string
  allocationId: string
  teacherId: string
  classId: string
  subjectId: string
  /** Optional preferred room — hard room clash when set on two overlapping blocks. */
  classroomId?: string | null
  span: number
  unitType: 'SINGLE' | 'DOUBLE' | 'TRIPLE'
}

export type PlacedBlock = SchedulerBlock & {
  day: string
  startPeriod: number
  startMin: number
  endMin: number
  startTime: string
  endTime: string
}

export type TimetableEntry = {
  allocationId: string
  teacherId: string
  subjectId: string
  classId: string
  classroomId?: string | null
  dayOfWeek: string
  startTime: string
  endTime: string
  durationMin: number
  periodType: string
  periodNumber: number
}

export type SchedulerConflict = {
  allocationId: string
  blockId?: string
  type: string
  message: string
  reason?: string
}

export type SchedulerStats = {
  placed: number
  unplaced: number
  backtracks: number
  llmUsed: boolean
  totalBlocks: number
  restarts?: number
}

export type SchedulerResult = {
  entries: TimetableEntry[]
  conflicts: SchedulerConflict[]
  stats: SchedulerStats
  unplacedBlocks: SchedulerBlock[]
  placedBlocks: PlacedBlock[]
}

export function periodsOverlap(
  start1: number,
  span1: number,
  start2: number,
  span2: number
): boolean {
  return !(start1 + span1 <= start2 || start2 + span2 <= start1)
}

function reservedSlotKey(teacherId: string, day: string, period: number) {
  return `${teacherId}|${normalizeDay(day)}|${period}`
}

function buildReservedSet(locks: LockedSlotReservation[] = []) {
  const set = new Set<string>()
  for (const lock of locks) {
    set.add(reservedSlotKey(lock.teacherId, lock.day, lock.periodNumber))
  }
  return set
}

type CanPlaceResult = { ok: true } | { ok: false; reason: string }

export type MultiBlockPlacement = {
  teacherId: string
  classId: string
  subjectId: string
  day: string
  span: number
}

/** Days apart on the Mon–Fri calendar (0 = same day). */
export function daysApart(day1: string, day2: string): number {
  const order: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }
  const a = order[normalizeDay(day1)] ?? 0
  const b = order[normalizeDay(day2)] ?? 0
  if (!a || !b) return 99
  return Math.abs(a - b)
}

/**
 * True when placing a multi-period block on `day` would stack doubles/triples
 * for the same class+subject on that day (e.g. two Maths doubles for 11A on Monday).
 * Does not block the same teacher teaching doubles to different classes on one day.
 */
export function wouldStackSameDay(
  block: Pick<SchedulerBlock, 'teacherId' | 'classId' | 'subjectId' | 'span'>,
  day: string,
  placed: MultiBlockPlacement[]
): boolean {
  const span = Math.max(1, Number(block.span) || 1)
  if (span < 2) return false
  const nd = normalizeDay(day)

  for (const pl of placed) {
    if (normalizeDay(pl.day) !== nd) continue
    if (Math.max(1, pl.span) < 2) continue
    if (pl.classId === block.classId && pl.subjectId === block.subjectId) return true
  }
  return false
}

/** Soft penalty when sorting days: prefer spreading teacher doubles across the week. */
export function teacherMultiBlockDayPenalty(
  teacherId: string,
  day: string,
  placed: Pick<MultiBlockPlacement, 'teacherId' | 'day' | 'span'>[]
): number {
  const nd = normalizeDay(day)
  const hasDouble = placed.some(
    (p) =>
      p.teacherId === teacherId &&
      normalizeDay(p.day) === nd &&
      Math.max(1, Number(p.span) || 1) >= 2
  )
  return hasDouble ? 0.5 : 0
}

/** Soft preference: same-subject multi-blocks should be ≥2 days apart when possible. */
export function tooCloseSameSubject(
  block: Pick<SchedulerBlock, 'classId' | 'subjectId' | 'span'>,
  day: string,
  placed: MultiBlockPlacement[]
): boolean {
  const span = Math.max(1, Number(block.span) || 1)
  if (span < 2) return false
  const nd = normalizeDay(day)
  return placed.some(
    (pl) =>
      Math.max(1, pl.span) >= 2 &&
      pl.classId === block.classId &&
      pl.subjectId === block.subjectId &&
      daysApart(pl.day, nd) < 2
  )
}

export function canPlace(
  block: SchedulerBlock,
  slot: { day: string; startPeriod: number; span: number; startTime?: string; endTime?: string },
  placed: PlacedBlock[],
  options?: {
    maxTeacherPeriodsPerDay?: number
    placementRule?: PlacementRule
    strictSoftConstraints?: boolean
    reservedTeacherSlots?: Set<string>
    breakAfterPeriods?: number[]
    allBlocks?: SchedulerBlock[]
    workingDayCount?: number
    teacherClassSessionRules?: Partial<TeacherClassSessionRulesConfig> | null
    teacherWorkloadRules?: Partial<TeacherWorkloadRulesConfig> | null
    breakSlots?: BreakSlotLike[] | null
  }
): CanPlaceResult {
  const { day, startPeriod } = slot
  const span = slot.span || block.span
  const workloadRules = normalizeTeacherWorkloadRules(
    options?.teacherWorkloadRules ??
      (options?.teacherClassSessionRules as Partial<TeacherWorkloadRulesConfig> | null) ??
      DEFAULT_TEACHER_WORKLOAD_RULES
  )
  const maxPerDay = options?.maxTeacherPeriodsPerDay ?? workloadRules.maxPeriodsPerDay
  const rule = options?.placementRule
  const strictSoft = options?.strictSoftConstraints === true
  const reserved = options?.reservedTeacherSlots
  const breakAfterPeriods = options?.breakAfterPeriods ?? BREAK_AFTER_PERIODS
  const sessionRules = normalizeTeacherClassSessionRules(
    options?.teacherClassSessionRules ?? DEFAULT_TEACHER_CLASS_SESSION_RULES
  )
  const breakSlots = Array.isArray(options?.breakSlots) ? options!.breakSlots! : []
  const nd = normalizeDay(day)

  if (!consecutivePeriodsAreValid(startPeriod, span, breakAfterPeriods)) {
    return { ok: false, reason: 'spans_break' }
  }

  for (let p = startPeriod; p < startPeriod + span; p++) {
    if (reserved?.has(reservedSlotKey(block.teacherId, day, p))) {
      return { ok: false, reason: 'locked_slot' }
    }

    if (isSlotForbidden(rule, day, p)) {
      return { ok: false, reason: 'forbidden_slot' }
    }
  }

  for (const pl of placed) {
    if (normalizeDay(pl.day) !== nd) continue

    if (pl.teacherId === block.teacherId && pl.classId === block.classId) {
      if (periodsOverlap(pl.startPeriod, pl.span, startPeriod, span)) {
        return { ok: false, reason: 'teacher_class_overlap' }
      }
      continue
    }

    if (
      pl.teacherId === block.teacherId &&
      periodsOverlap(pl.startPeriod, pl.span, startPeriod, span)
    ) {
      return { ok: false, reason: 'teacher_conflict' }
    }

    if (
      pl.classId === block.classId &&
      periodsOverlap(pl.startPeriod, pl.span, startPeriod, span)
    ) {
      return { ok: false, reason: 'grade_conflict' }
    }

    const roomA = String(block.classroomId || '').trim()
    const roomB = String(pl.classroomId || '').trim()
    if (
      roomA &&
      roomB &&
      roomA === roomB &&
      periodsOverlap(pl.startPeriod, pl.span, startPeriod, span)
    ) {
      return { ok: false, reason: 'room_conflict' }
    }
  }

  // Shared Rule A / Rule B (same logic as validateTimetable / CP-SAT)
  const fictive = (period: number) => {
    const mins = Math.max(0, (Number(period) || 1) - 1) * 40
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const candStart = String(slot.startTime || '').slice(0, 5) || fictive(startPeriod)
  const candEnd = String(slot.endTime || '').slice(0, 5) || fictive(startPeriod + Math.max(1, span))
  const candFrag: SessionFragment = {
    id: String(block.blockId),
    teacherId: String(block.teacherId),
    classId: String(block.classId),
    subjectId: String(block.subjectId),
    dayOfWeek: nd,
    startPeriod,
    endPeriod: startPeriod + Math.max(1, span) - 1,
    startTime: candStart,
    endTime: candEnd,
  }
  const placedFrags: SessionFragment[] = placed.map((pl) => {
    const pSpan = Math.max(1, Number(pl.span) || 1)
    const pStart = Number(pl.startPeriod)
    return {
      id: String(pl.blockId),
      teacherId: String(pl.teacherId),
      classId: String(pl.classId),
      subjectId: String(pl.subjectId),
      dayOfWeek: normalizeDay(pl.day),
      startPeriod: pStart,
      endPeriod: pStart + pSpan - 1,
      startTime: String(pl.startTime || '').slice(0, 5) || fictive(pStart),
      endTime: String(pl.endTime || '').slice(0, 5) || fictive(pStart + pSpan),
    }
  })
  const sessionHit = teacherClassSessionPlacementViolation(candFrag, placedFrags, sessionRules)
  if (sessionHit) {
    return { ok: false, reason: sessionHit.reason }
  }

  const candWorkload: WorkloadFragment = {
    id: String(block.blockId),
    teacherId: String(block.teacherId),
    dayOfWeek: nd,
    startTime: candStart,
    endTime: candEnd,
    periodWeight: Math.max(1, span),
  }
  const placedWorkload: WorkloadFragment[] = placed.map((pl) => {
    const pSpan = Math.max(1, Number(pl.span) || 1)
    const pStart = Number(pl.startPeriod)
    return {
      id: String(pl.blockId),
      teacherId: String(pl.teacherId),
      dayOfWeek: normalizeDay(pl.day),
      startTime: String(pl.startTime || '').slice(0, 5) || fictive(pStart),
      endTime: String(pl.endTime || '').slice(0, 5) || fictive(pStart + pSpan),
      periodWeight: pSpan,
    }
  })
  const workloadHit = teacherWorkloadPlacementViolation(
    candWorkload,
    placedWorkload,
    workloadRules,
    breakSlots
  )
  if (workloadHit) {
    return { ok: false, reason: workloadHit.reason }
  }

  if (strictSoft) {
    if (span >= 2 && wouldStackSameDay(block, day, placed)) {
      return { ok: false, reason: 'soft_same_day_multi_block' }
    }

    const sameSubjectSameDay = placed.find(
      (pl) => pl.subjectId === block.subjectId && pl.classId === block.classId && pl.day === day
    )
    if (sameSubjectSameDay) {
      return { ok: false, reason: 'soft_same_day' }
    }

    const enforceDaySoft =
      options?.maxTeacherPeriodsPerDay != null || workloadRules.maxPeriodsPerDayEnabled
    if (enforceDaySoft) {
      const teacherDayLoad = placed
        .filter((pl) => pl.teacherId === block.teacherId && pl.day === day)
        .reduce((sum, pl) => sum + Math.max(1, Number(pl.span) || 1), 0)
      if (teacherDayLoad + Math.max(1, span) > maxPerDay) {
        return { ok: false, reason: 'teacher_day_limit' }
      }
    }
  }

  return { ok: true }
}

export function expandAllocationsIntoBlocks(allocations: SchedulerAllocation[]): SchedulerBlock[] {
  const blocks: SchedulerBlock[] = []
  for (const alloc of allocations) {
    const units = expandAllocationToUnitsForAllClasses(alloc, String(alloc.id))
    for (const u of units) {
      blocks.push({
        blockId: u.id,
        allocationId: String(alloc.id),
        teacherId: String(alloc.teacherId),
        classId: String(u.classId),
        subjectId: String(alloc.subjectId),
        classroomId: alloc.classroomId ? String(alloc.classroomId) : null,
        span: u.consecutivePeriods,
        unitType: u.unitType,
      })
    }
  }
  return blocks
}

function sortBlocksHardestFirst(
  blocks: SchedulerBlock[],
  _daySlots: Record<string, DayPeriodSlot[]>,
  restartSeed = 0
): SchedulerBlock[] {
  const interleaved = interleaveBlocks(blocks)
  if (!restartSeed || interleaved.length <= 1) return interleaved
  const offset = restartSeed % interleaved.length
  return [...interleaved.slice(offset), ...interleaved.slice(0, offset)]
}

function getPeriodSlotsForDay(
  daySlots: Record<string, DayPeriodSlot[]>,
  day: string
): DayPeriodSlot[] {
  return (daySlots[day] || daySlots[normalizeDay(day)] || []).filter((s) => s.type === 'period')
}

function findSlotRun(
  dayPeriods: DayPeriodSlot[],
  startIndex: number,
  span: number
): DayPeriodSlot[] | null {
  if (startIndex < 0 || startIndex >= dayPeriods.length) return null
  const start = dayPeriods[startIndex]
  if (!start) return null

  const run: DayPeriodSlot[] = [start]
  for (let i = 1; i < span; i++) {
    const prev = dayPeriods[startIndex + i - 1]
    const cur = dayPeriods[startIndex + i]
    if (!cur) return null
    // Consecutive period numbers only — do NOT require cur.start === prev.end.
    // Zambian bells often have 1–10 min transitions (e.g. 10:00 → 10:05); that gap
    // must not kill doubles/triples. Break spanning is handled by consecutivePeriodsAreValid.
    if (Number(cur.periodNumber) !== Number(prev.periodNumber) + 1) return null
    run.push(cur)
  }
  return run.length === span ? run : null
}

export type SchedulerCandidateSlot = {
  day: string
  startPeriod: number
  span: number
  run: DayPeriodSlot[]
}

export function getCandidateSlots(
  block: SchedulerBlock,
  daySlots: Record<string, DayPeriodSlot[]>,
  _singleMin: number,
  breakAfterPeriods: number[] = BREAK_AFTER_PERIODS,
  dayOrderOffset = 0
): SchedulerCandidateSlot[] {
  const candidates: SchedulerCandidateSlot[] = []
  const days = Object.keys(daySlots).sort(
    (a, b) => (DAY_ORDER[normalizeDay(a)] ?? 99) - (DAY_ORDER[normalizeDay(b)] ?? 99)
  )
  const offset = days.length ? ((dayOrderOffset % days.length) + days.length) % days.length : 0
  const rotatedDays = [...days.slice(offset), ...days.slice(0, offset)]

  for (const day of rotatedDays) {
    const periods = getPeriodSlotsForDay(daySlots, day)
    for (let i = 0; i <= periods.length - block.span; i++) {
      const run = findSlotRun(periods, i, block.span)
      if (!run) continue
      if (!consecutivePeriodsAreValid(Number(run[0].periodNumber), block.span, breakAfterPeriods))
        continue
      candidates.push({
        day: normalizeDay(day),
        startPeriod: Number(run[0].periodNumber),
        span: block.span,
        run,
      })
    }
  }
  return candidates
}

function blockToEntry(block: PlacedBlock, singleMin: number): TimetableEntry {
  const periodType =
    block.unitType || (block.span >= 3 ? 'TRIPLE' : block.span === 2 ? 'DOUBLE' : 'SINGLE')
  return {
    allocationId: block.allocationId,
    teacherId: block.teacherId,
    subjectId: block.subjectId,
    classId: block.classId,
    classroomId: block.classroomId || null,
    dayOfWeek: block.day,
    startTime: block.startTime,
    endTime: block.endTime,
    durationMin: block.span * singleMin,
    periodType,
    periodNumber: block.startPeriod,
  }
}

function conflictMessage(alloc: SchedulerAllocation | undefined, block: SchedulerBlock): string {
  const teacher = alloc?.teacher?.name || 'Teacher'
  const subject = alloc?.subject?.name || 'Subject'
  const cls = alloc?.class?.name || 'Class'
  return `Could not place ${block.unitType} for ${teacher} — ${subject} (${cls})`
}

export type GenerateTimetableOptions = {
  singleMin?: number
  maxExecutionMs?: number
  maxTeacherPeriodsPerDay?: number
  recipeRules?: RecipeLikeForRules[]
  teacherConstraintRules?: DbConstraintLike[]
  strictSoftConstraints?: boolean
  reservedTeacherSlots?: LockedSlotReservation[]
  initialPlaced?: PlacedBlock[]
  blocksSubset?: SchedulerBlock[]
  restartSeed?: number
  maxRestarts?: number
  /** Shared with audit / CP-SAT (teacherClassSessionRules.ts). */
  teacherClassSessionRules?: Partial<TeacherClassSessionRulesConfig> | null
  teacherWorkloadRules?: Partial<TeacherWorkloadRulesConfig> | null
  breakSlots?: BreakSlotLike[] | null
}

function buildSchedulerResult(
  placed: PlacedBlock[],
  sortedBlocks: SchedulerBlock[],
  allBlocks: SchedulerBlock[],
  backtracks: number,
  complete: boolean,
  singleMin: number,
  allocById: Map<string, SchedulerAllocation>
): SchedulerResult {
  const placedIds = new Set(placed.map((p) => p.blockId))
  const unplacedBlocks = allBlocks.filter((b) => !placedIds.has(b.blockId))

  const conflicts: SchedulerConflict[] = unplacedBlocks.map((block) => ({
    allocationId: block.allocationId,
    blockId: block.blockId,
    type: block.unitType,
    message: conflictMessage(allocById.get(block.allocationId), block),
    reason: complete ? 'exhausted' : 'timeout_or_exhausted',
  }))

  return {
    entries: placed.map((p) => blockToEntry(p, singleMin)),
    conflicts,
    unplacedBlocks,
    placedBlocks: placed,
    stats: {
      placed: placed.filter((p) => sortedBlocks.some((b) => b.blockId === p.blockId)).length,
      unplaced: unplacedBlocks.length,
      backtracks,
      llmUsed: false,
      totalBlocks: allBlocks.length,
    },
  }
}

/**
 * Single backtracking pass (one restart).
 */
export function generateTimetableOnce(
  allocations: SchedulerAllocation[],
  daySlots: Record<string, DayPeriodSlot[]>,
  options: GenerateTimetableOptions = {}
): SchedulerResult {
  const singleMin = Math.max(1, Number(options.singleMin) || 40)
  const maxMs = Math.max(2000, Number(options.maxExecutionMs) || 8000)
  const started = Date.now()
  const restartSeed = Number(options.restartSeed) || 0

  const recipeRulesMap = buildRecipePlacementRules(options.recipeRules || [])
  const teacherRulesMap = buildTeacherDbConstraintRules(options.teacherConstraintRules || [])
  const reservedSet = buildReservedSet(options.reservedTeacherSlots)

  const allocById = new Map(allocations.map((a) => [String(a.id), a]))
  const allBlocks = options.blocksSubset?.length
    ? options.blocksSubset
    : expandAllocationsIntoBlocks(allocations)
  const breakAfterPeriods = deriveBreakAfterPeriods(daySlots)

  let backtracks = 0
  let reassignments = 0
  let reassignDepth = 0
  const MAX_REASSIGN_DEPTH = 3
  const placed: PlacedBlock[] = [...(options.initialPlaced || [])]
  const sortedBlocks = sortBlocksHardestFirst(allBlocks, daySlots, restartSeed)

  function timedOut() {
    return Date.now() - started > maxMs
  }

  const canPlaceOpts = {
    maxTeacherPeriodsPerDay: options.maxTeacherPeriodsPerDay,
    strictSoftConstraints: options.strictSoftConstraints,
    reservedTeacherSlots: reservedSet,
    breakAfterPeriods,
    allBlocks,
    workingDayCount: Object.keys(daySlots).length,
    teacherClassSessionRules: options.teacherClassSessionRules,
    teacherWorkloadRules: options.teacherWorkloadRules ?? options.teacherClassSessionRules,
    breakSlots: options.breakSlots,
  }

  function pushPlacedFromCandidate(block: SchedulerBlock, cand: SchedulerCandidateSlot) {
    const run = cand.run
    const first = run[0]
    const last = run[run.length - 1]
    placed.push({
      ...block,
      day: cand.day,
      startPeriod: cand.startPeriod,
      startMin: first.start,
      endMin: last.end,
      startTime: first.startTime,
      endTime: last.endTime,
    })
  }

  function sortCandidates(block: SchedulerBlock, candidates: SchedulerCandidateSlot[]) {
    shuffleArraySeeded(candidates, restartSeed, block.blockId.charCodeAt(0) || 0)

    const seed = (block.teacherId.charCodeAt(0) + block.subjectId.charCodeAt(0) + restartSeed) | 0

    candidates.sort((a, b) => {
      const rule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, block)
      const prefA = placementPreferenceScore(rule, a.day, a.startPeriod)
      const prefB = placementPreferenceScore(rule, b.day, b.startPeriod)
      if (prefA !== prefB) return prefA - prefB

      const classSubjectDayLoad = new Map<string, number>()
      const teacherDayLoad = new Map<string, number>()
      for (const pl of placed) {
        const csKey = `${pl.classId}|${pl.subjectId}|${pl.day}`
        classSubjectDayLoad.set(csKey, (classSubjectDayLoad.get(csKey) || 0) + 1)
        const tKey = `${pl.teacherId}|${pl.day}`
        teacherDayLoad.set(tKey, (teacherDayLoad.get(tKey) || 0) + 1)
      }

      const daySpread = compareDaySpread({
        teacherId: block.teacherId,
        classId: block.classId,
        subjectId: block.subjectId,
        dayA: a.day,
        dayB: b.day,
        teacherDayLoad,
        classSubjectDayLoad,
        teacherMultiPenalty: (tid, day) => teacherMultiBlockDayPenalty(tid, day, placed),
      })
      if (daySpread !== 0) return daySpread

      const teacherPlaced: PlacedPeriodLite[] = placed
        .filter((p) => p.teacherId === block.teacherId)
        .map((p) => ({
          teacherId: p.teacherId,
          classId: p.classId,
          subjectId: p.subjectId,
          day: p.day,
          startPeriod: p.startPeriod,
          startMin: slotTimeMinutes(p.startTime),
        }))

      const scoreA = scoreSchedulerPlacement({
        teacherId: block.teacherId,
        classId: block.classId,
        subjectId: block.subjectId,
        day: a.day,
        startPeriod: a.startPeriod,
        placed: teacherPlaced,
        startMin: a.run[0] ? slotTimeMinutes(a.run[0].startTime) : undefined,
        randomJitter: true,
        jitterSeed: seed + a.startPeriod * 17 + DAY_ORDER[normalizeDay(a.day)] * 11,
      })
      const scoreB = scoreSchedulerPlacement({
        teacherId: block.teacherId,
        classId: block.classId,
        subjectId: block.subjectId,
        day: b.day,
        startPeriod: b.startPeriod,
        placed: teacherPlaced,
        startMin: b.run[0] ? slotTimeMinutes(b.run[0].startTime) : undefined,
        randomJitter: true,
        jitterSeed: seed + b.startPeriod * 17 + DAY_ORDER[normalizeDay(b.day)] * 11,
      })
      if (scoreA !== scoreB) return scoreA - scoreB

      const closeA = tooCloseSameSubject(block, a.day, placed) ? 1 : 0
      const closeB = tooCloseSameSubject(block, b.day, placed) ? 1 : 0
      return closeA - closeB
    })
  }

  function tryReassignTeacherClassBlocks(blockIndex: number): boolean {
    if (reassignDepth >= MAX_REASSIGN_DEPTH) return false
    reassignDepth += 1
    try {
      const block = sortedBlocks[blockIndex]
      const victims = placed
        .map((pl, idx) => ({ pl, idx }))
        .filter(({ pl }) => pl.teacherId === block.teacherId && pl.classId === block.classId)

      for (const { pl: victim, idx: victimIdx } of victims) {
        const removed = placed.splice(victimIdx, 1)[0]
        const victimBlock: SchedulerBlock = {
          blockId: removed.blockId,
          allocationId: removed.allocationId,
          teacherId: removed.teacherId,
          classId: removed.classId,
          subjectId: removed.subjectId,
          classroomId: removed.classroomId || null,
          span: removed.span,
          unitType: removed.unitType,
        }

        const altCandidates = getCandidateSlots(
          victimBlock,
          daySlots,
          singleMin,
          breakAfterPeriods,
          restartSeed
        )
        sortCandidates(victimBlock, altCandidates)
        for (const alt of altCandidates) {
          const placementRule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, victimBlock)
          const check = canPlace(victimBlock, alt, placed, { ...canPlaceOpts, placementRule })
          if (!check.ok) continue

          pushPlacedFromCandidate(victimBlock, alt)
          reassignments += 1
          if (backtrackPlace(blockIndex)) return true

          placed.pop()
          reassignments += 1
        }

        placed.splice(victimIdx, 0, removed)
      }

      return false
    } finally {
      reassignDepth -= 1
    }
  }

  function backtrackPlace(index: number): boolean {
    if (timedOut()) return false
    if (index >= sortedBlocks.length) return true

    const block = sortedBlocks[index]
    const candidates = getCandidateSlots(block, daySlots, singleMin, breakAfterPeriods, restartSeed)

    sortCandidates(block, candidates)

    for (const cand of candidates) {
      if (timedOut()) return false
      const placementRule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, block)
      const check = canPlace(block, cand, placed, { ...canPlaceOpts, placementRule })
      if (!check.ok) continue

      const run = cand.run
      const first = run[0]
      const last = run[run.length - 1]
      placed.push({
        ...block,
        day: cand.day,
        startPeriod: cand.startPeriod,
        startMin: first.start,
        endMin: last.end,
        startTime: first.startTime,
        endTime: last.endTime,
      })

      if (backtrackPlace(index + 1)) return true

      placed.pop()
      backtracks += 1
    }

    if (tryReassignTeacherClassBlocks(index)) return true

    return false
  }

  const complete = backtrackPlace(0)
  const result = buildSchedulerResult(
    placed,
    sortedBlocks,
    allBlocks,
    backtracks,
    complete,
    singleMin,
    allocById
  )
  result.stats.placed = placed.length - (options.initialPlaced?.length || 0)
  return result
}

/**
 * Backtracking scheduler for HOD-pushed allocations with multi-restart.
 */
export function generateTimetable(
  allocations: SchedulerAllocation[],
  daySlots: Record<string, DayPeriodSlot[]>,
  options: GenerateTimetableOptions = {}
): SchedulerResult {
  const maxRestarts = Math.max(1, Number(options.maxRestarts) || 3)
  let best: SchedulerResult | null = null

  for (let restart = 0; restart < maxRestarts; restart++) {
    const result = generateTimetableOnce(allocations, daySlots, {
      ...options,
      restartSeed: restart,
    })

    if (result.unplacedBlocks.length === 0) {
      result.stats.restarts = restart + 1
      return result
    }

    if (
      !best ||
      result.unplacedBlocks.length < best.unplacedBlocks.length ||
      (result.unplacedBlocks.length === best.unplacedBlocks.length &&
        result.stats.placed > best.stats.placed)
    ) {
      best = result
    }
  }

  const final = best!
  final.stats.restarts = maxRestarts
  return final
}

/** Merge LLM-resolved placements into a partial scheduler result. */
export function mergePlacements(
  base: SchedulerResult,
  extraPlaced: PlacedBlock[],
  singleMin: number
): SchedulerResult {
  const placedIds = new Set(base.placedBlocks.map((p) => p.blockId))
  const merged = [...base.placedBlocks]
  for (const p of extraPlaced) {
    if (placedIds.has(p.blockId)) continue
    placedIds.add(p.blockId)
    merged.push(p)
  }
  const unplacedBlocks = base.unplacedBlocks.filter((b) => !placedIds.has(b.blockId))
  const conflicts = unplacedBlocks.map((block) => ({
    allocationId: block.allocationId,
    blockId: block.blockId,
    type: block.unitType,
    message: `Could not place ${block.unitType} (allocation ${block.allocationId})`,
    reason: 'unresolved',
  }))
  return {
    entries: merged.map((p) => blockToEntry(p, singleMin)),
    conflicts,
    unplacedBlocks,
    placedBlocks: merged,
    stats: {
      ...base.stats,
      placed: merged.length,
      unplaced: unplacedBlocks.length,
      llmUsed: extraPlaced.length > 0,
    },
  }
}

/** Convert scheduler result stats for a combined placed set. */
export function schedulerResultFromPlaced(
  placed: PlacedBlock[],
  allBlocks: SchedulerBlock[],
  singleMin: number,
  allocById: Map<string, SchedulerAllocation>,
  extraStats?: Partial<SchedulerStats>
): SchedulerResult {
  const placedIds = new Set(placed.map((p) => p.blockId))
  const unplacedBlocks = allBlocks.filter((b) => !placedIds.has(b.blockId))
  const conflicts = unplacedBlocks.map((block) => ({
    allocationId: block.allocationId,
    blockId: block.blockId,
    type: block.unitType,
    message: conflictMessage(allocById.get(block.allocationId), block),
    reason: 'unresolved',
  }))
  return {
    entries: placed.map((p) => blockToEntry(p, singleMin)),
    conflicts,
    unplacedBlocks,
    placedBlocks: placed,
    stats: {
      placed: placed.length,
      unplaced: unplacedBlocks.length,
      backtracks: extraStats?.backtracks ?? 0,
      llmUsed: extraStats?.llmUsed ?? false,
      totalBlocks: allBlocks.length,
      restarts: extraStats?.restarts,
    },
  }
}
