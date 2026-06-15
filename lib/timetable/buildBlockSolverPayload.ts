/**
 * Build solver-service payload from allocation blocks (doubles/triples as atomic groups).
 */
import {
  BREAK_AFTER_PERIODS,
  expandAllocationsIntoBlocks,
  normalizeDay,
  type DayPeriodSlot,
  type PlacedBlock,
  type SchedulerAllocation,
  type SchedulerBlock,
  type TimetableEntry,
} from '@/lib/timetable/scheduler'
import type { LockedSlotReservation } from '@/lib/timetable/preflightFeasibility'
import type { DbConstraintLike, RecipeLikeForRules } from '@/lib/timetable/constraintRules'

export type SolverServiceSlot = {
  id: string
  dayOfWeek: string
  period: number
  startTime: string
  endTime: string
  isBreak: boolean
}

export type SolverServiceLesson = {
  id: string
  teacherId: string
  classId: string
  subjectId: string
  blockId: string
  periodIndex: number
}

export type SolverServiceAtomicGroup = {
  lessonIds: string[]
  allowedDays?: string[]
  preferMorning?: boolean
}

export type SolverServicePayload = {
  teachers: Array<{ id: string; name: string; maxHoursPerWeek: number; subjectIds: string[] }>
  classes: Array<{ id: string; name: string }>
  slots: SolverServiceSlot[]
  lessons: SolverServiceLesson[]
  atomicGroups: SolverServiceAtomicGroup[]
  lockedAssignments: Array<{ teacherId: string; slotId: string }>
  constraints: Array<{
    id: string
    type: 'HARD' | 'SOFT'
    scope: string
    targetId?: string
    priority: number
    config: Record<string, unknown>
  }>
  breakAfterPeriods: number[]
  maxSolutions: number
  timeoutMs: number
}

export type DbTimeSlotRow = {
  id: string
  dayOfWeek: string
  period: number
  startTime: string
  endTime: string
  isBreak: boolean
}

const lessonIdFor = (blockId: string, periodIndex: number) => `${blockId}::p${periodIndex}`

/** Map DB TimeSlot rows to solver slots (teaching slots only for lesson domains). */
export function dbSlotsToSolverSlots(rows: DbTimeSlotRow[]): SolverServiceSlot[] {
  return rows.map((s) => ({
    id: String(s.id),
    dayOfWeek: normalizeDay(s.dayOfWeek),
    period: Number(s.period) || 1,
    startTime: String(s.startTime),
    endTime: String(s.endTime),
    isBreak: Boolean(s.isBreak),
  }))
}

/** Build day-period → slotId lookup from teaching slots. */
export function slotIdByDayPeriod(slots: SolverServiceSlot[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const s of slots.filter((x) => !x.isBreak)) {
    map.set(`${normalizeDay(s.dayOfWeek)}|${s.period}`, s.id)
  }
  return map
}

export function daySlotsToSolverSlots(
  daySlots: Record<string, DayPeriodSlot[]>
): SolverServiceSlot[] {
  const out: SolverServiceSlot[] = []
  for (const [day, rows] of Object.entries(daySlots)) {
    for (const row of rows || []) {
      if (row.type === 'break') {
        out.push({
          id: `break-${normalizeDay(day)}-${row.start}`,
          dayOfWeek: normalizeDay(day),
          period: 0,
          startTime: row.startTime,
          endTime: row.endTime,
          isBreak: true,
        })
        continue
      }
      out.push({
        id: `slot-${normalizeDay(day)}-p${row.periodNumber}`,
        dayOfWeek: normalizeDay(day),
        period: Number(row.periodNumber),
        startTime: row.startTime,
        endTime: row.endTime,
        isBreak: false,
      })
    }
  }
  return out
}

/**
 * Expand blocks into per-period lessons + atomic groups for multi-period blocks.
 */
export function blocksToSolverLessons(blocks: SchedulerBlock[]): {
  lessons: SolverServiceLesson[]
  atomicGroups: SolverServiceAtomicGroup[]
  blockLessonIds: Map<string, string[]>
} {
  const lessons: SolverServiceLesson[] = []
  const atomicGroups: SolverServiceAtomicGroup[] = []
  const blockLessonIds = new Map<string, string[]>()

  for (const block of blocks) {
    const ids: string[] = []
    for (let i = 0; i < block.span; i++) {
      const lid = lessonIdFor(block.blockId, i)
      ids.push(lid)
      lessons.push({
        id: lid,
        teacherId: block.teacherId,
        classId: block.classId,
        subjectId: block.subjectId,
        blockId: block.blockId,
        periodIndex: i,
      })
    }
    blockLessonIds.set(block.blockId, ids)
    if (ids.length > 1) {
      atomicGroups.push({ lessonIds: ids })
    }
  }

  return { lessons, atomicGroups, blockLessonIds }
}

export function buildBlockSolverPayload(opts: {
  allocations: SchedulerAllocation[]
  dbTimeSlots: DbTimeSlotRow[]
  lockedSlots?: LockedSlotReservation[]
  recipes?: RecipeLikeForRules[]
  constraints?: DbConstraintLike[]
  blocksSubset?: SchedulerBlock[]
  timeoutMs?: number
}): SolverServicePayload {
  const allocations = opts.allocations
  const allBlocks = opts.blocksSubset?.length
    ? opts.blocksSubset
    : expandAllocationsIntoBlocks(allocations)

  const slots = dbSlotsToSolverSlots(opts.dbTimeSlots)
  const slotLookup = slotIdByDayPeriod(slots)
  const { lessons, atomicGroups } = blocksToSolverLessons(allBlocks)

  const teacherIds = new Set<string>()
  const classIds = new Set<string>()
  const teacherSubjects = new Map<string, Set<string>>()
  const classNames = new Map<string, string>()
  const teacherNames = new Map<string, string>()

  for (const alloc of allocations) {
    teacherIds.add(String(alloc.teacherId))
    classIds.add(String(alloc.classId))
    if (!teacherSubjects.has(String(alloc.teacherId))) {
      teacherSubjects.set(String(alloc.teacherId), new Set())
    }
    teacherSubjects.get(String(alloc.teacherId))!.add(String(alloc.subjectId))
    if (alloc.class?.name) classNames.set(String(alloc.classId), alloc.class.name)
    if (alloc.teacher?.name) teacherNames.set(String(alloc.teacherId), alloc.teacher.name)
  }

  const lockedAssignments: Array<{ teacherId: string; slotId: string }> = []
  for (const lock of opts.lockedSlots || []) {
    const slotId = slotLookup.get(`${normalizeDay(lock.day)}|${lock.periodNumber}`)
    if (slotId && lock.timeSlotId) {
      lockedAssignments.push({ teacherId: lock.teacherId, slotId: lock.timeSlotId })
    } else if (slotId) {
      lockedAssignments.push({ teacherId: lock.teacherId, slotId })
    }
  }

  const constraints = (opts.constraints || []).map((c, i) => ({
    id: `c-${i}`,
    type: (String(c.type || '').toUpperCase() === 'SOFT' ? 'SOFT' : 'HARD') as 'HARD' | 'SOFT',
    scope: String(c.scope || 'SCHOOL'),
    targetId: c.targetId ? String(c.targetId) : undefined,
    priority: 5,
    config: (c.config as Record<string, unknown>) || {},
  }))

  return {
    teachers: [...teacherIds].map((id) => ({
      id,
      name: teacherNames.get(id) || id,
      maxHoursPerWeek: 40,
      subjectIds: [...(teacherSubjects.get(id) || [])],
    })),
    classes: [...classIds].map((id) => ({
      id,
      name: classNames.get(id) || id,
    })),
    slots,
    lessons,
    atomicGroups,
    lockedAssignments,
    constraints,
    breakAfterPeriods: [...BREAK_AFTER_PERIODS],
    maxSolutions: 500,
    timeoutMs: Math.max(5000, Number(opts.timeoutMs) || 30000),
  }
}

export type SolverServiceResult = {
  assignments: Record<string, string>
  optimizationScore: number
  stats: Record<string, unknown>
}

export async function callSolverServiceHttp(
  baseUrl: string,
  payload: SolverServicePayload
): Promise<SolverServiceResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/solve`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(payload.timeoutMs + 5000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(String(data?.detail || data?.error || res.statusText))
  }
  return data as SolverServiceResult
}

/** Map solver lesson assignments back to placed blocks + timetable entries. */
export function mapSolverAssignmentsToResult(opts: {
  assignments: Record<string, string>
  blocks: SchedulerBlock[]
  slots: SolverServiceSlot[]
  singleMin: number
}): { placedBlocks: PlacedBlock[]; entries: TimetableEntry[] } {
  const { assignments, blocks, singleMin } = opts
  const slotById = new Map(opts.slots.map((s) => [s.id, s]))
  const { blockLessonIds } = blocksToSolverLessons(blocks)
  const placedBlocks: PlacedBlock[] = []

  for (const block of blocks) {
    const lessonIds = blockLessonIds.get(block.blockId) || []
    if (!lessonIds.length) continue

    const assignedSlots = lessonIds
      .map((lid) => slotById.get(String(assignments[lid] || '')))
      .filter(Boolean) as SolverServiceSlot[]

    if (assignedSlots.length !== block.span) continue

    assignedSlots.sort((a, b) => a.period - b.period)
    const first = assignedSlots[0]
    const last = assignedSlots[assignedSlots.length - 1]

    placedBlocks.push({
      ...block,
      day: normalizeDay(first.dayOfWeek),
      startPeriod: first.period,
      startMin: 0,
      endMin: 0,
      startTime: first.startTime,
      endTime: last.endTime,
    })
  }

  const entries: TimetableEntry[] = placedBlocks.map((p) => ({
    allocationId: p.allocationId,
    teacherId: p.teacherId,
    subjectId: p.subjectId,
    classId: p.classId,
    dayOfWeek: p.day,
    startTime: p.startTime,
    endTime: p.endTime,
    durationMin: p.span * singleMin,
    periodType: p.unitType,
    periodNumber: p.startPeriod,
  }))

  return { placedBlocks, entries }
}

export function mergeSolverWithPartial(opts: {
  existingPlaced: PlacedBlock[]
  solverPlaced: PlacedBlock[]
  allBlocks: SchedulerBlock[]
}): PlacedBlock[] {
  const placedIds = new Set(opts.existingPlaced.map((p) => p.blockId))
  const merged = [...opts.existingPlaced]
  for (const p of opts.solverPlaced) {
    if (placedIds.has(p.blockId)) continue
    placedIds.add(p.blockId)
    merged.push(p)
  }
  return merged
}
