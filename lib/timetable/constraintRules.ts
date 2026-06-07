/**
 * Recipe + DB constraint helpers used by solvers during placement search.
 */

export type PlacementRule = {
  forbiddenDays: Set<string>
  forbiddenPeriods: Set<number>
  preferredDays: Set<string>
  preferredPeriods: Set<number>
}

export type RecipeBlockLike = {
  forbiddenDays?: string[] | null
  forbiddenPeriods?: number[] | null
  preferredDays?: string[] | null
  preferredPeriods?: number[] | null
}

export type RecipeLikeForRules = {
  teacherId: string
  classId: string
  subjectId: string
  blocks?: RecipeBlockLike[] | null
}

export type DbConstraintLike = {
  type?: string
  scope?: string
  targetId?: string | null
  active?: boolean
  config?: Record<string, unknown> | null
}

function normDay(day: string) {
  return String(day || '')
    .trim()
    .toLowerCase()
}

function normPeriod(p: unknown) {
  const n = Number(p)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function mergeRule(existing: PlacementRule | undefined, block: RecipeBlockLike): PlacementRule {
  const next: PlacementRule = existing || {
    forbiddenDays: new Set(),
    forbiddenPeriods: new Set(),
    preferredDays: new Set(),
    preferredPeriods: new Set(),
  }
  for (const d of block.forbiddenDays || []) {
    const nd = normDay(d)
    if (nd) next.forbiddenDays.add(nd)
  }
  for (const p of block.forbiddenPeriods || []) {
    const np = normPeriod(p)
    if (np != null) next.forbiddenPeriods.add(np)
  }
  for (const d of block.preferredDays || []) {
    const nd = normDay(d)
    if (nd) next.preferredDays.add(nd)
  }
  for (const p of block.preferredPeriods || []) {
    const np = normPeriod(p)
    if (np != null) next.preferredPeriods.add(np)
  }
  return next
}

export function lessonKey(teacherId: string, classId: string, subjectId: string) {
  return `${teacherId}|${classId}|${subjectId}`
}

/** Merge all recipe blocks for a teacher/class/subject into one rule set. */
export function buildRecipePlacementRules(
  recipes: RecipeLikeForRules[]
): Map<string, PlacementRule> {
  const map = new Map<string, PlacementRule>()
  for (const recipe of recipes || []) {
    const key = lessonKey(recipe.teacherId, recipe.classId, recipe.subjectId)
    for (const block of recipe.blocks || []) {
      map.set(key, mergeRule(map.get(key), block))
    }
  }
  return map
}

export function buildTeacherDbConstraintRules(
  constraints: DbConstraintLike[]
): Map<string, PlacementRule> {
  const map = new Map<string, PlacementRule>()
  for (const c of constraints || []) {
    if (c.active === false) continue
    if (String(c.type || '').toUpperCase() !== 'HARD') continue
    if (String(c.scope || '').toUpperCase() !== 'TEACHER') continue
    const targetId = String(c.targetId || '').trim()
    if (!targetId) continue
    const cfg = (c.config || {}) as Record<string, unknown>
    const block: RecipeBlockLike = {
      forbiddenDays: Array.isArray(cfg.forbiddenDays)
        ? (cfg.forbiddenDays as string[])
        : Array.isArray(cfg.days)
          ? (cfg.days as string[])
          : [],
      forbiddenPeriods: Array.isArray(cfg.forbiddenPeriods)
        ? (cfg.forbiddenPeriods as number[])
        : Array.isArray(cfg.periods)
          ? (cfg.periods as number[])
          : [],
    }
    map.set(targetId, mergeRule(map.get(targetId), block))
  }
  return map
}

export function isSlotForbidden(
  rule: PlacementRule | undefined,
  day: string,
  period: number
): boolean {
  if (!rule) return false
  const d = normDay(day)
  const p = normPeriod(period)
  if (rule.forbiddenDays.has(d)) return true
  if (p != null && rule.forbiddenPeriods.has(p)) return true
  return false
}

/** Lower score = better (preferred slots sort first). */
export function placementPreferenceScore(
  rule: PlacementRule | undefined,
  day: string,
  period: number
): number {
  if (!rule) return 50
  const d = normDay(day)
  const p = normPeriod(period) ?? 0
  let score = 50
  if (rule.preferredDays.has(d)) score -= 15
  if (rule.preferredPeriods.has(p)) score -= 10
  if (rule.forbiddenDays.has(d)) score += 1000
  if (rule.forbiddenPeriods.has(p)) score += 1000
  return score
}

export function getLessonPlacementRule(
  recipeRules: Map<string, PlacementRule>,
  teacherRules: Map<string, PlacementRule>,
  lesson: { teacherId: string; classId: string; subjectId: string }
): PlacementRule | undefined {
  const fromRecipe = recipeRules.get(lessonKey(lesson.teacherId, lesson.classId, lesson.subjectId))
  const fromTeacher = teacherRules.get(String(lesson.teacherId))
  if (!fromRecipe && !fromTeacher) return undefined
  if (!fromRecipe) return fromTeacher
  if (!fromTeacher) return fromRecipe
  return {
    forbiddenDays: new Set([...fromRecipe.forbiddenDays, ...fromTeacher.forbiddenDays]),
    forbiddenPeriods: new Set([...fromRecipe.forbiddenPeriods, ...fromTeacher.forbiddenPeriods]),
    preferredDays: new Set([...fromRecipe.preferredDays, ...fromTeacher.preferredDays]),
    preferredPeriods: new Set([...fromRecipe.preferredPeriods, ...fromTeacher.preferredPeriods]),
  }
}
