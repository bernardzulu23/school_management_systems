/**
 * Zambian secondary timetable scheduler — greedy + backtracking.
 *
 * Hard constraints (never violated):
 *  1. Teacher cannot teach two grades at the same time.
 *  2. Grade cannot have two subjects at the same time.
 *  3. Multi-period blocks (double/triple) for the same class+subject or teacher
 *     cannot stack on the same day (spread across weekdays).
 *
 * Soft constraints (optional during search via strictSoftConstraints):
 *  - Same subject twice on same day for same grade
 *  - Teacher daily period cap
 */

import { expandAllocationToUnits, type AllocationLike } from '@/lib/timetable/periodExpansion'
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

/** Period numbers after which a break/lunch occurs — blocks cannot cross these. */
export const BREAK_AFTER_PERIODS = [2, 5]

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

export function periodsOverlap(
  start1: number,
  span1: number,
  start2: number,
  span2: number
): boolean {
  return !(start1 + span1 <= start2 || start2 + span2 <= start1)
}

export function consecutivePeriodsAreValid(startPeriod: number, span: number): boolean {
  for (const breakAfter of BREAK_AFTER_PERIODS) {
    if (startPeriod <= breakAfter && startPeriod + span - 1 > breakAfter) {
      return false
    }
  }
  return true
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
 * for the same class+subject or the same teacher on that day.
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
    if (pl.teacherId === block.teacherId) return true
  }
  return false
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
  slot: { day: string; startPeriod: number; span: number },
  placed: PlacedBlock[],
  options?: {
    maxTeacherPeriodsPerDay?: number
    placementRule?: PlacementRule
    strictSoftConstraints?: boolean
    reservedTeacherSlots?: Set<string>
  }
): CanPlaceResult {
  const { day, startPeriod } = slot
  const span = slot.span || block.span
  const maxPerDay = options?.maxTeacherPeriodsPerDay ?? 6
  const rule = options?.placementRule
  const strictSoft = options?.strictSoftConstraints === true
  const reserved = options?.reservedTeacherSlots

  if (!consecutivePeriodsAreValid(startPeriod, span)) {
    return { ok: false, reason: 'spans_break' }
  }

  for (let p = startPeriod; p < startPeriod + span; p++) {
    if (reserved?.has(reservedSlotKey(block.teacherId, day, p))) {
      return { ok: false, reason: 'locked_slot' }
    }

    if (isSlotForbidden(rule, day, p)) {
      return { ok: false, reason: 'forbidden_slot' }
    }

    for (const pl of placed) {
      if (pl.day !== day) continue

      if (pl.teacherId === block.teacherId && periodsOverlap(pl.startPeriod, pl.span, p, 1)) {
        return { ok: false, reason: 'teacher_conflict' }
      }

      if (pl.classId === block.classId && periodsOverlap(pl.startPeriod, pl.span, p, 1)) {
        return { ok: false, reason: 'grade_conflict' }
      }
    }
  }

  if (span >= 2 && wouldStackSameDay(block, day, placed)) {
    return { ok: false, reason: 'same_day_multi_block' }
  }

  if (strictSoft) {
    const sameSubjectSameDay = placed.find(
      (pl) => pl.subjectId === block.subjectId && pl.classId === block.classId && pl.day === day
    )
    if (sameSubjectSameDay) {
      return { ok: false, reason: 'soft_same_day' }
    }

    const teacherDayLoad = placed.filter(
      (pl) => pl.teacherId === block.teacherId && pl.day === day
    ).length
    if (teacherDayLoad >= maxPerDay) {
      return { ok: false, reason: 'teacher_day_limit' }
    }
  }

  return { ok: true }
}

export function expandAllocationsIntoBlocks(allocations: SchedulerAllocation[]): SchedulerBlock[] {
  const blocks: SchedulerBlock[] = []
  for (const alloc of allocations) {
    const units = expandAllocationToUnits(alloc, String(alloc.id))
    for (const u of units) {
      blocks.push({
        blockId: u.id,
        allocationId: String(alloc.id),
        teacherId: String(alloc.teacherId),
        classId: String(alloc.classId),
        subjectId: String(alloc.subjectId),
        span: u.consecutivePeriods,
        unitType: u.unitType,
      })
    }
  }
  return blocks
}

function sortBlocksHardestFirst(
  blocks: SchedulerBlock[],
  daySlots: Record<string, DayPeriodSlot[]>,
  restartSeed = 0
): SchedulerBlock[] {
  const teacherSlotCount = new Map<string, number>()
  for (const b of blocks) {
    if (!teacherSlotCount.has(b.teacherId)) {
      const days = Object.keys(daySlots).length || 5
      const periodsPerDay =
        (daySlots[Object.keys(daySlots)[0]] || []).filter((s) => s.type === 'period').length || 8
      teacherSlotCount.set(b.teacherId, days * periodsPerDay)
    }
  }

  const pseudoRandom = (n: number) => {
    const x = Math.sin(restartSeed * 9973 + n * 7919) * 10000
    return x - Math.floor(x)
  }

  return [...blocks].sort((a, b) => {
    if (b.span !== a.span) return b.span - a.span
    const ta = teacherSlotCount.get(a.teacherId) ?? 0
    const tb = teacherSlotCount.get(b.teacherId) ?? 0
    if (ta !== tb) return ta - tb
    return pseudoRandom(a.blockId.length) - pseudoRandom(b.blockId.length)
  })
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
    if (Number(cur.periodNumber) !== Number(prev.periodNumber) + 1) return null
    if (cur.start !== prev.end) return null
    run.push(cur)
  }
  return run.length === span ? run : null
}

export function getCandidateSlots(
  block: SchedulerBlock,
  daySlots: Record<string, DayPeriodSlot[]>,
  _singleMin: number
): Array<{ day: string; startPeriod: number; span: number; run: DayPeriodSlot[] }> {
  const candidates: Array<{
    day: string
    startPeriod: number
    span: number
    run: DayPeriodSlot[]
  }> = []
  const days = Object.keys(daySlots).sort(
    (a, b) => (DAY_ORDER[normalizeDay(a)] ?? 99) - (DAY_ORDER[normalizeDay(b)] ?? 99)
  )

  for (const day of days) {
    const periods = getPeriodSlotsForDay(daySlots, day)
    for (let i = 0; i <= periods.length - block.span; i++) {
      const run = findSlotRun(periods, i, block.span)
      if (!run) continue
      if (!consecutivePeriodsAreValid(Number(run[0].periodNumber), block.span)) continue
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

  let backtracks = 0
  const placed: PlacedBlock[] = [...(options.initialPlaced || [])]
  const sortedBlocks = sortBlocksHardestFirst(allBlocks, daySlots, restartSeed)

  function timedOut() {
    return Date.now() - started > maxMs
  }

  const canPlaceOpts = {
    maxTeacherPeriodsPerDay: options.maxTeacherPeriodsPerDay,
    strictSoftConstraints: options.strictSoftConstraints,
    reservedTeacherSlots: reservedSet,
  }

  function backtrackPlace(index: number): boolean {
    if (timedOut()) return false
    if (index >= sortedBlocks.length) return true

    const block = sortedBlocks[index]
    const candidates = getCandidateSlots(block, daySlots, singleMin)

    candidates.sort((a, b) => {
      const rule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, block)
      const prefA = placementPreferenceScore(rule, a.day, a.startPeriod)
      const prefB = placementPreferenceScore(rule, b.day, b.startPeriod)
      if (prefA !== prefB) return prefA - prefB
      const loadA = placed.filter((p) => p.teacherId === block.teacherId && p.day === a.day).length
      const loadB = placed.filter((p) => p.teacherId === block.teacherId && p.day === b.day).length
      if (loadA !== loadB) return loadA - loadB
      const closeA = tooCloseSameSubject(block, a.day, placed) ? 1 : 0
      const closeB = tooCloseSameSubject(block, b.day, placed) ? 1 : 0
      return closeA - closeB
    })

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
