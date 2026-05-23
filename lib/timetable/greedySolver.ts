/**
 * Greedy timetable solver — Vercel + Neon, no external services.
 * Expands weekly period counts (e.g. 6 periods = 3×80min doubles) across days.
 */

import {
  expandRecipeToUnits,
  normalizeAllocationPeriods,
  resolveSchedulableUnits,
  type AllocationLike,
  type RecipeLike,
  type SchedulableUnit,
  type TeachingAssignmentLike,
} from '@/lib/timetable/periodExpansion'

export interface TimeSlot {
  id: string
  dayOfWeek: string
  period: number
  startTime: string
  endTime: string
  isBreak: boolean
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
  if (size <= 1) return daySlots[startIndex] ? [daySlots[startIndex]] : null
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

function unitPriority(lesson: Lesson): number {
  return Number(lesson.consecutivePeriods) || 1
}

/**
 * Greedy scheduling: spread across days; doubles/triples use consecutive slots on one day.
 */
export function greedySolve(payload: SolverPayload): SolverResult {
  const lessons = resolveLessonsForSolver(payload)
  const { slots, lockedAssignments } = payload

  const assignments: Record<string, string> = {}
  const slotSpans: Record<string, string[]> = {}
  const teacherSlots = new Map<string, Set<string>>()
  const classSlots = new Map<string, Set<string>>()
  const teacherDayLoad = new Map<string, number>()

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

  const sortedLessons = [...lessons].sort((a, b) => {
    const pa = unitPriority(b) - unitPriority(a)
    if (pa !== 0) return pa
    if (a.teacherId !== b.teacherId) return a.teacherId.localeCompare(b.teacherId)
    if (a.classId !== b.classId) return a.classId.localeCompare(b.classId)
    return a.subjectId.localeCompare(b.subjectId)
  })

  const maxAssign = Math.max(
    1,
    Math.min(sortedLessons.length, Number(payload.maxSolutions) || sortedLessons.length)
  )

  let assignedCount = 0

  const isBusy = (lesson: Lesson, slotIds: string[]) =>
    slotIds.some(
      (sid) =>
        (teacherSlots.get(lesson.teacherId)?.has(sid) ?? false) ||
        (classSlots.get(lesson.classId)?.has(sid) ?? false)
    )

  const markBusy = (lesson: Lesson, slotIds: string[]) => {
    for (const sid of slotIds) {
      teacherSlots.get(lesson.teacherId)?.add(sid)
      classSlots.get(lesson.classId)?.add(sid)
    }
    const day = normalizeDay(teachingSlots.find((s) => s.id === slotIds[0])?.dayOfWeek || 'monday')
    const key = `${lesson.teacherId}|${day}`
    teacherDayLoad.set(key, (teacherDayLoad.get(key) || 0) + 1)
  }

  const dayOrder = Array.from(byDay.keys()).sort(
    (a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99)
  )

  for (const lesson of sortedLessons) {
    if (assignedCount >= maxAssign) break

    const size = Math.max(1, Number(lesson.consecutivePeriods) || 1)

    // Prefer days where this teacher already has fewer blocks (spread across week)
    const daysSorted = [...dayOrder].sort((da, db) => {
      const la = teacherDayLoad.get(`${lesson.teacherId}|${da}`) || 0
      const lb = teacherDayLoad.get(`${lesson.teacherId}|${db}`) || 0
      return la - lb
    })

    let placed: { primaryId: string; allIds: string[] } | null = null

    for (const day of daysSorted) {
      const daySlots = byDay.get(day) || []
      for (let i = 0; i <= daySlots.length - size; i++) {
        const run = findConsecutiveRun(daySlots, i, size)
        if (!run) continue
        const ids = run.map((s) => s.id)
        if (isBusy(lesson, ids)) continue
        placed = { primaryId: ids[0], allIds: ids }
        break
      }
      if (placed) break
    }

    if (!placed) continue

    assignments[lesson.id] = placed.primaryId
    slotSpans[lesson.id] = placed.allIds
    markBusy(lesson, placed.allIds)
    assignedCount += 1
  }

  const total = lessons.length
  const score = total > 0 ? Math.round((assignedCount / total) * 100) : 100
  const success = assignedCount === total && total > 0

  const result: SolverResult = {
    assignments,
    slotSpans,
    optimizationScore: score,
    stats: {
      solver: 'greedy',
      assigned: assignedCount,
      total,
      success,
      notes: `Greedy algorithm assigned ${assignedCount}/${total} teaching blocks (${score}% coverage). Period counts are weekly totals spread across days, not slot number 6.`,
      timestamp: new Date().toISOString(),
    },
  }

  const validation = validateResult(result, lessons, slots)
  if (!validation.valid) {
    result.stats.validationErrors = validation.errors.slice(0, 20)
  }

  return result
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
