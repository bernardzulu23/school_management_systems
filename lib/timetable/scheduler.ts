/**
 * Zambian secondary timetable scheduler — greedy + backtracking.
 *
 * Hard constraints (never violated):
 *  1. Teacher cannot teach two grades at the same time.
 *  2. Grade cannot have two subjects at the same time.
 *
 * Soft constraints (blocked during search where noted):
 *  - Same subject twice on same day for same grade
 *  - Double/triple cannot span break after period 2 or lunch after period 5
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

type CanPlaceResult = { ok: true } | { ok: false; reason: string }

export function canPlace(
  block: SchedulerBlock,
  slot: { day: string; startPeriod: number; span: number },
  placed: PlacedBlock[],
  options?: {
    maxTeacherPeriodsPerDay?: number
    placementRule?: PlacementRule
  }
): CanPlaceResult {
  const { day, startPeriod } = slot
  const span = slot.span || block.span
  const maxPerDay = options?.maxTeacherPeriodsPerDay ?? 6
  const rule = options?.placementRule

  if (!consecutivePeriodsAreValid(startPeriod, span)) {
    return { ok: false, reason: 'spans_break' }
  }

  for (let p = startPeriod; p < startPeriod + span; p++) {
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
  placed: PlacedBlock[]
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
  for (const pl of placed) {
    // already placed reduce remaining — not used for initial sort
  }

  return [...blocks].sort((a, b) => {
    if (b.span !== a.span) return b.span - a.span
    const ta = teacherSlotCount.get(a.teacherId) ?? 0
    const tb = teacherSlotCount.get(b.teacherId) ?? 0
    return ta - tb
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
  span: number,
  singleMin: number
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
  singleMin: number
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
      const run = findSlotRun(periods, i, block.span, singleMin)
      if (!run) continue
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
}

/**
 * Backtracking scheduler for HOD-pushed allocations.
 */
export function generateTimetable(
  allocations: SchedulerAllocation[],
  daySlots: Record<string, DayPeriodSlot[]>,
  options: GenerateTimetableOptions = {}
): SchedulerResult {
  const singleMin = Math.max(1, Number(options.singleMin) || 40)
  const maxMs = Math.max(2000, Number(options.maxExecutionMs) || 8000)
  const started = Date.now()

  const recipeRulesMap = buildRecipePlacementRules(options.recipeRules || [])
  const teacherRulesMap = buildTeacherDbConstraintRules(options.teacherConstraintRules || [])

  const allocById = new Map(allocations.map((a) => [String(a.id), a]))
  const allBlocks = expandAllocationsIntoBlocks(allocations)
  let backtracks = 0

  const placed: PlacedBlock[] = []

  const sortedBlocks = sortBlocksHardestFirst(allBlocks, daySlots, placed)

  function timedOut() {
    return Date.now() - started > maxMs
  }

  function backtrackPlace(index: number): boolean {
    if (timedOut()) return false
    if (index >= sortedBlocks.length) return true

    const block = sortedBlocks[index]
    const candidates = getCandidateSlots(block, daySlots, singleMin)

    // Prefer days with lighter teacher load
    candidates.sort((a, b) => {
      const rule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, block)
      const prefA = placementPreferenceScore(rule, a.day, a.startPeriod)
      const prefB = placementPreferenceScore(rule, b.day, b.startPeriod)
      if (prefA !== prefB) return prefA - prefB
      const loadA = placed.filter((p) => p.teacherId === block.teacherId && p.day === a.day).length
      const loadB = placed.filter((p) => p.teacherId === block.teacherId && p.day === b.day).length
      return loadA - loadB
    })

    for (const cand of candidates) {
      if (timedOut()) return false
      const placementRule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, block)
      const check = canPlace(block, cand, placed, { ...options, placementRule })
      if (!check.ok) continue

      const run = cand.run
      const first = run[0]
      const last = run[run.length - 1]
      const placedBlock: PlacedBlock = {
        ...block,
        day: cand.day,
        startPeriod: cand.startPeriod,
        startMin: first.start,
        endMin: last.end,
        startTime: first.startTime,
        endTime: last.endTime,
      }
      placed.push(placedBlock)

      if (backtrackPlace(index + 1)) return true

      placed.pop()
      backtracks += 1
    }

    return false
  }

  const complete = backtrackPlace(0)

  const placedIds = new Set(placed.map((p) => p.blockId))
  const unplacedBlocks = sortedBlocks.filter((b) => !placedIds.has(b.blockId))

  const conflicts: SchedulerConflict[] = unplacedBlocks.map((block) => ({
    allocationId: block.allocationId,
    blockId: block.blockId,
    type: block.unitType,
    message: conflictMessage(allocById.get(block.allocationId), block),
    reason: complete ? 'exhausted' : 'timeout_or_exhausted',
  }))

  const entries = placed.map((p) => blockToEntry(p, singleMin))

  return {
    entries,
    conflicts,
    unplacedBlocks,
    placedBlocks: placed,
    stats: {
      placed: placed.length,
      unplaced: unplacedBlocks.length,
      backtracks,
      llmUsed: false,
      totalBlocks: sortedBlocks.length,
    },
  }
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
