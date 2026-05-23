/**
 * Greedy timetable solver — Vercel + Neon, no external services.
 */

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
  rooms?: unknown[]
}

export interface RecipeInput {
  id: string
  teachingAssignmentId?: string | null
  teacherId: string
  classId: string
  subjectId: string
  expectedPeriodsPerWeek?: number | null
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

/** Build lesson rows from scheduling recipes when teaching assignments are empty. */
export function expandLessonsFromRecipes(lessons: Lesson[], recipes: RecipeInput[]): Lesson[] {
  if (!recipes?.length) return lessons

  const out = [...lessons]
  const seen = new Set(out.map((l) => l.id))

  for (const recipe of recipes) {
    const teacherId = String(recipe.teacherId || '')
    const classId = String(recipe.classId || '')
    const subjectId = String(recipe.subjectId || '')
    if (!teacherId || !classId || !subjectId) continue

    let count = Number(recipe.expectedPeriodsPerWeek) || 0
    if (Array.isArray(recipe.blocks) && recipe.blocks.length) {
      count = 0
      for (const block of recipe.blocks) {
        const size = Math.max(1, Number(block.size) || 1)
        const qty = Math.max(1, Number(block.quantity) || 1)
        count += size * qty
      }
    }
    if (!count) count = 1

    const baseId = String(recipe.teachingAssignmentId || recipe.id)

    for (let i = 0; i < count; i++) {
      const id = `${baseId}-p${i + 1}`
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ id, teacherId, classId, subjectId })
    }
  }

  return out
}

/** Prefer teaching assignments; fall back to recipe-expanded lessons. */
export function resolveLessonsForSolver(payload: SolverPayload): Lesson[] {
  const fromDb = payload.lessons || []
  if (fromDb.length) return fromDb
  return expandLessonsFromRecipes([], payload.recipes || [])
}

/**
 * Greedy scheduling: teacher + class free per slot; locked teacher slots reserved.
 */
export function greedySolve(payload: SolverPayload): SolverResult {
  const lessons = resolveLessonsForSolver(payload)
  const { slots, lockedAssignments } = payload

  const assignments: Record<string, string> = {}
  const teacherSlots = new Map<string, Set<string>>()
  const classSlots = new Map<string, Set<string>>()

  for (const teacher of payload.teachers) {
    teacherSlots.set(teacher.id, new Set())
  }
  for (const cls of payload.classes) {
    classSlots.set(cls.id, new Set())
  }

  for (const lock of lockedAssignments || []) {
    teacherSlots.get(lock.teacherId)?.add(lock.slotId)
  }

  const availableSlots = sortSlots(slots.filter((s) => !s.isBreak))

  const sortedLessons = [...lessons].sort((a, b) => {
    if (a.teacherId !== b.teacherId) return a.teacherId.localeCompare(b.teacherId)
    if (a.classId !== b.classId) return a.classId.localeCompare(b.classId)
    return a.subjectId.localeCompare(b.subjectId)
  })

  const maxAssign = Math.max(
    1,
    Math.min(sortedLessons.length, Number(payload.maxSolutions) || sortedLessons.length)
  )

  let assignedCount = 0

  for (const lesson of sortedLessons) {
    if (assignedCount >= maxAssign) break

    const slot =
      availableSlots.find((s) => {
        const teacherBusy = teacherSlots.get(lesson.teacherId)?.has(s.id) ?? false
        const classBusy = classSlots.get(lesson.classId)?.has(s.id) ?? false
        return !teacherBusy && !classBusy
      }) ?? null

    if (!slot) continue

    assignments[lesson.id] = slot.id
    teacherSlots.get(lesson.teacherId)?.add(slot.id)
    classSlots.get(lesson.classId)?.add(slot.id)
    assignedCount += 1
  }

  const total = lessons.length
  const score = total > 0 ? Math.round((assignedCount / total) * 100) : 100
  const success = assignedCount === total && total > 0

  const result: SolverResult = {
    assignments,
    optimizationScore: score,
    stats: {
      solver: 'greedy',
      assigned: assignedCount,
      total,
      success,
      notes: `Greedy algorithm assigned ${assignedCount}/${total} lessons (${score}% coverage)`,
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

    const key = `${lesson.teacherId}|${slotId}`
    if (teacherBySlot.has(key)) {
      errors.push(`Teacher ${lesson.teacherId} double-booked in slot ${slotId}`)
    }
    teacherBySlot.set(key, lessonId)
  }

  const classBySlot = new Map<string, string>()
  for (const [lessonId, slotId] of Object.entries(result.assignments)) {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) continue

    const key = `${lesson.classId}|${slotId}`
    if (classBySlot.has(key)) {
      errors.push(`Class ${lesson.classId} double-booked in slot ${slotId}`)
    }
    classBySlot.set(key, lessonId)
  }

  return { valid: errors.length === 0, errors }
}
