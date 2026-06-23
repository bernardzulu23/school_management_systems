/**
 * Timetable solver — backtracking with greedy fallback, Vercel + Neon.
 * Expands weekly period counts (e.g. 6 periods = 3×80min doubles) across days.
 */

const DEFAULT_MAX_EXECUTION_MS = 8000

import {
  normalizeAllocationPeriods,
  expandRecipeToUnits,
  resolveSchedulableUnits,
  type AllocationLike,
  type RecipeLike,
  type SchedulableUnit,
  type TeachingAssignmentLike,
} from '@/lib/timetable/periodExpansion'
import {
  buildRecipePlacementRules,
  buildTeacherDbConstraintRules,
  getLessonPlacementRule,
  isSlotForbidden,
  placementPreferenceScore,
  type DbConstraintLike,
  type RecipeLikeForRules,
} from '@/lib/timetable/constraintRules'
import {
  wouldStackSameDay,
  teacherMultiBlockDayPenalty,
  type MultiBlockPlacement,
} from '@/lib/timetable/scheduler'
import { interleaveLessons, compareDaySpread } from '@/lib/timetable/lessonOrdering'
import { compareSchedulerPlacements, type PlacedPeriodLite } from '@/lib/timetable/slotScoring'

export interface TimeSlot {
  id: string
  dayOfWeek: string
  period: number
  startTime: string
  endTime: string
  isBreak: boolean
  isDouble?: boolean
  duration?: number | null
  label?: string
}

export interface Lesson {
  id: string
  teacherId: string
  classId: string
  subjectId: string
  consecutivePeriods?: number
}

export interface Teacher {
  id: string
  assignedSubjects?: string[]
  user?: { name: string | null } | null
}

export interface ClassData {
  id: string
  name: string
}

export interface LockedAssignment {
  teacherId: string
  slotId: string
}

export interface SolverPayload {
  name: string
  maxSolutions: number
  teachers: Teacher[]
  classes: ClassData[]
  slots: TimeSlot[]
  lessons: Lesson[]
  constraints: unknown[]
  lockedAssignments: LockedAssignment[]
  recipes: RecipeInput[]
  teacherAllocations?: AllocationLike[]
  rooms?: unknown[]
  /** Serverless safety limit for backtracking (ms). */
  maxExecutionMs?: number
}

export interface RecipeInput extends RecipeLike {
  blocks?: Array<{
    id?: string
    size?: number
    quantity?: number
    placementPriority?: number
    preferredDays?: string[]
    preferredPeriods?: number[]
    forbiddenDays?: string[]
    forbiddenPeriods?: number[]
    allowSplitAcrossBreaks?: boolean
    isLocked?: boolean
  }>
}

export interface SolverResult {
  assignments: Record<string, string>
  /** lessonId -> all slot ids occupied (doubles/triples span multiple slots) */
  slotSpans: Record<string, string[]>
  optimizationScore: number
  stats: {
    solver: string
    assigned: number
    total: number
    success: boolean
    notes: string
    timestamp: string
    validationErrors?: string[]
  }
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

function normalizeDay(day: string) {
  return String(day || 'monday')
    .trim()
    .toLowerCase()
}

function sortSlots(slots: TimeSlot[]) {
  return [...slots].sort((a, b) => {
    const da = DAY_ORDER[normalizeDay(a.dayOfWeek)] ?? 99
    const db = DAY_ORDER[normalizeDay(b.dayOfWeek)] ?? 99
    if (da !== db) return da - db
    return (Number(a.period) || 0) - (Number(b.period) || 0)
  })
}

function slotsByDay(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const map = new Map<string, TimeSlot[]>()
  for (const s of slots) {
    const day = normalizeDay(s.dayOfWeek)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(s)
  }
  for (const [, list] of map) {
    list.sort((a, b) => (Number(a.period) || 0) - (Number(b.period) || 0))
  }
  return map
}

function findConsecutiveRun(
  daySlots: TimeSlot[],
  startIndex: number,
  size: number
): TimeSlot[] | null {
  const start = daySlots[startIndex]
  if (!start || start.isBreak) return null
  if (size <= 1) return [start]

  if (size === 2 && start.isDouble) {
    const next = daySlots[startIndex + 1]
    if (next && !next.isBreak && Number(next.period) === Number(start.period) + 1) {
      return [start, next]
    }
  }

  const run: TimeSlot[] = []
  for (let i = 0; i < size; i++) {
    const slot = daySlots[startIndex + i]
    const prev = daySlots[startIndex + i - 1]
    if (!slot || slot.isBreak) return null
    if (i > 0 && Number(slot.period) !== Number(prev.period) + 1) return null
    run.push(slot)
  }
  return run.length === size ? run : null
}

/** @deprecated Use resolveSchedulableUnits via resolveLessonsForSolver */
export function expandLessonsFromRecipes(lessons: Lesson[], recipes: RecipeInput[]): Lesson[] {
  const units = resolveSchedulableUnits({
    teachingAssignments: [],
    recipes,
    allocations: [],
  })
  if (!units.length) return lessons
  return units.map((u) => ({
    id: u.id,
    teacherId: u.teacherId,
    classId: u.classId,
    subjectId: u.subjectId,
    consecutivePeriods: u.consecutivePeriods,
  }))
}

export function resolveLessonsForSolver(payload: SolverPayload): Lesson[] {
  const units = resolveSchedulableUnits({
    teachingAssignments: (payload.lessons || []) as TeachingAssignmentLike[],
    recipes: payload.recipes || [],
    allocations: payload.teacherAllocations || [],
  })

  if (units.length) {
    return units.map((u) => ({
      id: u.id,
      teacherId: u.teacherId,
      classId: u.classId,
      subjectId: u.subjectId,
      consecutivePeriods: u.consecutivePeriods,
    }))
  }

  return payload.lessons || []
}

/**
 * Backtracking scheduler: undoes placements that block later lessons.
 */
export function solveTimetable(payload: SolverPayload): SolverResult {
  const START_TIME = Date.now()
  const MAX_MS = Math.max(1000, Number(payload.maxExecutionMs) || DEFAULT_MAX_EXECUTION_MS)

  const lessons = resolveLessonsForSolver(payload)
  const { slots, lockedAssignments } = payload

  const assignments: Record<string, string> = {}
  const slotSpans: Record<string, string[]> = {}
  const teacherSlots = new Map<string, Set<string>>()
  const classSlots = new Map<string, Set<string>>()
  const teacherDayLoad = new Map<string, number>()
  const classSubjectDayLoad = new Map<string, number>()
  const placedMulti: MultiBlockPlacement[] = []

  for (const teacher of payload.teachers) {
    teacherSlots.set(teacher.id, new Set())
  }
  for (const cls of payload.classes) {
    classSlots.set(cls.id, new Set())
  }

  for (const lock of lockedAssignments || []) {
    teacherSlots.get(lock.teacherId)?.add(lock.slotId)
  }

  const teachingSlots = sortSlots(slots.filter((s) => !s.isBreak))
  const byDay = slotsByDay(teachingSlots)

  const recipeRulesMap = buildRecipePlacementRules((payload.recipes || []) as RecipeLikeForRules[])
  const teacherRulesMap = buildTeacherDbConstraintRules(
    (payload.constraints || []) as DbConstraintLike[]
  )

  const isSlotAllowed = (lesson: Lesson, run: TimeSlot[]) => {
    const rule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, lesson)
    for (const slot of run) {
      if (isSlotForbidden(rule, normalizeDay(slot.dayOfWeek), Number(slot.period) || 0)) {
        return false
      }
    }
    return true
  }

  const sortedLessons = interleaveLessons(lessons)

  let assignedCount = 0
  let timedOut = false

  const isBusy = (lesson: Lesson, slotIds: string[]) =>
    slotIds.some(
      (sid) =>
        (teacherSlots.get(lesson.teacherId)?.has(sid) ?? false) ||
        (classSlots.get(lesson.classId)?.has(sid) ?? false)
    )

  const teacherClassSubjectDay = new Set<string>()

  const teacherClassSubjectKey = (lesson: Lesson, day: string) =>
    `${lesson.teacherId}|${lesson.classId}|${lesson.subjectId}|${normalizeDay(day)}`

  const markBusy = (lesson: Lesson, slotIds: string[], day: string) => {
    for (const sid of slotIds) {
      teacherSlots.get(lesson.teacherId)?.add(sid)
      classSlots.get(lesson.classId)?.add(sid)
    }
    const nd = normalizeDay(day)
    teacherClassSubjectDay.add(teacherClassSubjectKey(lesson, nd))
    const teacherKey = `${lesson.teacherId}|${nd}`
    teacherDayLoad.set(teacherKey, (teacherDayLoad.get(teacherKey) || 0) + 1)
    const csKey = `${lesson.classId}|${lesson.subjectId}|${nd}`
    classSubjectDayLoad.set(csKey, (classSubjectDayLoad.get(csKey) || 0) + 1)
  }

  const unmarkBusy = (lesson: Lesson, slotIds: string[], day: string) => {
    for (const sid of slotIds) {
      teacherSlots.get(lesson.teacherId)?.delete(sid)
      classSlots.get(lesson.classId)?.delete(sid)
    }
    const nd = normalizeDay(day)
    teacherClassSubjectDay.delete(teacherClassSubjectKey(lesson, nd))
    const teacherKey = `${lesson.teacherId}|${nd}`
    const curTeacher = teacherDayLoad.get(teacherKey) || 0
    if (curTeacher <= 1) teacherDayLoad.delete(teacherKey)
    else teacherDayLoad.set(teacherKey, curTeacher - 1)

    const csKey = `${lesson.classId}|${lesson.subjectId}|${nd}`
    const curCs = classSubjectDayLoad.get(csKey) || 0
    if (curCs <= 1) classSubjectDayLoad.delete(csKey)
    else classSubjectDayLoad.set(csKey, curCs - 1)
  }

  const sortDaysForLesson = (lesson: Lesson) =>
    [...dayOrder].sort((da, db) =>
      compareDaySpread({
        teacherId: lesson.teacherId,
        classId: lesson.classId,
        subjectId: lesson.subjectId,
        dayA: da,
        dayB: db,
        teacherDayLoad,
        classSubjectDayLoad,
        teacherMultiPenalty: (tid, day) => teacherMultiBlockDayPenalty(tid, day, placedMulti),
      })
    )

  const sortStartIndices = (lesson: Lesson, day: string, daySlots: TimeSlot[], size: number) => {
    const indices = Array.from({ length: Math.max(0, daySlots.length - size + 1) }, (_, i) => i)

    const placedLite: PlacedPeriodLite[] = []
    for (const [lessonId, spanIds] of Object.entries(slotSpans)) {
      const firstId = spanIds?.[0]
      if (!firstId) continue
      const slot = slots.find((s) => s.id === firstId)
      const les = lessons.find((l) => l.id === lessonId)
      if (!slot || !les) continue
      placedLite.push({
        teacherId: les.teacherId,
        day: normalizeDay(slot.dayOfWeek),
        startPeriod: Number(slot.period) || 0,
      })
    }

    return indices.sort((ia, ib) => {
      const runA = findConsecutiveRun(daySlots, ia, size)
      const runB = findConsecutiveRun(daySlots, ib, size)
      if (!runA && !runB) return 0
      if (!runA) return 1
      if (!runB) return -1

      const rule = getLessonPlacementRule(recipeRulesMap, teacherRulesMap, lesson)
      const periodA = Number(runA[0]?.period) || 0
      const periodB = Number(runB[0]?.period) || 0
      const scoreA = placementPreferenceScore(rule, day, periodA)
      const scoreB = placementPreferenceScore(rule, day, periodB)
      if (scoreA !== scoreB) return scoreA - scoreB

      const periodSpread = compareSchedulerPlacements(
        {
          teacherId: lesson.teacherId,
          day,
          startPeriod: periodA,
          placed: placedLite,
          randomJitter: true,
        },
        {
          teacherId: lesson.teacherId,
          day,
          startPeriod: periodB,
          placed: placedLite,
          randomJitter: true,
        }
      )
      if (periodSpread !== 0) return periodSpread

      return periodA - periodB
    })
  }

  const wouldStackGreedy = (lesson: Lesson, day: string) => {
    const size = Math.max(1, Number(lesson.consecutivePeriods) || 1)
    if (size < 2) return false
    return wouldStackSameDay(
      {
        teacherId: lesson.teacherId,
        classId: lesson.classId,
        subjectId: lesson.subjectId,
        span: size,
      },
      day,
      placedMulti
    )
  }

  const markMulti = (lesson: Lesson, day: string) => {
    const size = Math.max(1, Number(lesson.consecutivePeriods) || 1)
    if (size < 2) return
    placedMulti.push({
      teacherId: lesson.teacherId,
      classId: lesson.classId,
      subjectId: lesson.subjectId,
      day: normalizeDay(day),
      span: size,
    })
  }

  const unmarkMulti = (lesson: Lesson, day: string) => {
    const size = Math.max(1, Number(lesson.consecutivePeriods) || 1)
    if (size < 2) return
    const nd = normalizeDay(day)
    const idx = placedMulti.findIndex(
      (p) =>
        p.teacherId === lesson.teacherId &&
        p.classId === lesson.classId &&
        p.subjectId === lesson.subjectId &&
        p.day === nd &&
        p.span === size
    )
    if (idx >= 0) placedMulti.splice(idx, 1)
  }

  const dayOrder = Array.from(byDay.keys()).sort(
    (a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99)
  )

  function solveDepthFirst(lessonIndex: number): boolean {
    if (Date.now() - START_TIME > MAX_MS) {
      timedOut = true
      return false
    }

    if (lessonIndex >= sortedLessons.length) return true

    const lesson = sortedLessons[lessonIndex]
    const size = Math.max(1, Number(lesson.consecutivePeriods) || 1)

    const daysSorted = sortDaysForLesson(lesson)

    for (const day of daysSorted) {
      const daySlots = byDay.get(day) || []
      const startIndices = sortStartIndices(lesson, day, daySlots, size)

      for (const i of startIndices) {
        if (Date.now() - START_TIME > MAX_MS) {
          timedOut = true
          return false
        }

        const run = findConsecutiveRun(daySlots, i, size)
        if (!run) continue
        const ids = run.map((s) => s.id)
        if (isBusy(lesson, ids)) continue
        if (!isSlotAllowed(lesson, run)) continue
        if (wouldStackGreedy(lesson, day)) continue
        if (teacherClassSubjectDay.has(teacherClassSubjectKey(lesson, day))) continue

        assignments[lesson.id] = ids[0]
        slotSpans[lesson.id] = ids
        markBusy(lesson, ids, day)
        markMulti(lesson, day)
        assignedCount += 1

        if (solveDepthFirst(lessonIndex + 1)) return true

        delete assignments[lesson.id]
        delete slotSpans[lesson.id]
        unmarkBusy(lesson, ids, day)
        unmarkMulti(lesson, day)
        assignedCount -= 1
      }
    }

    return false
  }

  const completeSuccess = solveDepthFirst(0)

  if (!completeSuccess && assignedCount < sortedLessons.length) {
    greedyFillRemaining()
  }

  function greedyFillRemaining() {
    for (let li = 0; li < sortedLessons.length; li++) {
      const lesson = sortedLessons[li]
      if (assignments[lesson.id]) continue

      const size = Math.max(1, Number(lesson.consecutivePeriods) || 1)
      const daysSorted = sortDaysForLesson(lesson)

      for (const day of daysSorted) {
        const daySlots = byDay.get(day) || []
        const startIndices = sortStartIndices(lesson, day, daySlots, size)
        for (const i of startIndices) {
          const run = findConsecutiveRun(daySlots, i, size)
          if (!run) continue
          const ids = run.map((s) => s.id)
          if (isBusy(lesson, ids)) continue
          if (!isSlotAllowed(lesson, run)) continue
          if (wouldStackGreedy(lesson, day)) continue
          if (teacherClassSubjectDay.has(teacherClassSubjectKey(lesson, day))) continue
          assignments[lesson.id] = ids[0]
          slotSpans[lesson.id] = ids
          markBusy(lesson, ids, day)
          markMulti(lesson, day)
          assignedCount += 1
          break
        }
        if (assignments[lesson.id]) break
      }
    }
  }

  const total = lessons.length
  const score = total > 0 ? Math.round((assignedCount / total) * 100) : 100
  const success = assignedCount === total && total > 0 && completeSuccess

  const solverName = completeSuccess
    ? 'backtracking'
    : timedOut
      ? 'backtracking+partial'
      : 'backtracking+greedy'

  const result: SolverResult = {
    assignments,
    slotSpans,
    optimizationScore: score,
    stats: {
      solver: solverName,
      assigned: assignedCount,
      total,
      success,
      notes: completeSuccess
        ? `Successfully generated timetable (${assignedCount}/${total} blocks).`
        : timedOut
          ? `Timed out after ${MAX_MS}ms. Placed ${assignedCount}/${total} teaching blocks.`
          : `Partial schedule: ${assignedCount}/${total} blocks (${score}% coverage).`,
      timestamp: new Date().toISOString(),
    },
  }

  const validation = validateResult(result, lessons, slots)
  if (!validation.valid) {
    result.stats.validationErrors = validation.errors.slice(0, 20)
  }

  return result
}

/** @alias solveTimetable */
export function greedySolve(payload: SolverPayload): SolverResult {
  return solveTimetable(payload)
}

export function validateResult(
  result: SolverResult,
  lessons: Lesson[],
  _slots: TimeSlot[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const assignedIds = new Set(Object.keys(result.assignments))

  for (const lesson of lessons) {
    if (!assignedIds.has(lesson.id)) {
      errors.push(`Lesson ${lesson.id} not assigned`)
    }
  }

  const teacherBySlot = new Map<string, string>()
  for (const [lessonId, slotId] of Object.entries(result.assignments)) {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) continue
    const span = result.slotSpans?.[lessonId] || [slotId]
    for (const sid of span) {
      const key = `${lesson.teacherId}|${sid}`
      if (teacherBySlot.has(key)) {
        errors.push(`Teacher ${lesson.teacherId} double-booked in slot ${sid}`)
      }
      teacherBySlot.set(key, lessonId)
    }
  }

  const classBySlot = new Map<string, string>()
  for (const [lessonId, slotId] of Object.entries(result.assignments)) {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) continue
    const span = result.slotSpans?.[lessonId] || [slotId]
    for (const sid of span) {
      const key = `${lesson.classId}|${sid}`
      if (classBySlot.has(key)) {
        errors.push(`Class ${lesson.classId} double-booked in slot ${sid}`)
      }
      classBySlot.set(key, lessonId)
    }
  }

  return { valid: errors.length === 0, errors }
}

export { normalizeAllocationPeriods, expandRecipeToUnits, resolveSchedulableUnits }
