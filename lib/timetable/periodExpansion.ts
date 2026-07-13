/**
 * Expand "6 periods per week" allocations into schedulable units (singles / doubles / triples).
 * A period = 40 minutes; a double = 2 consecutive periods (80 min) on one day.
 */

export type PeriodBreakdown = {
  singles: number
  doubles: number
  triples: number
  totalPeriods: number
}

export type AllocationLike = {
  id?: string
  teacherId: string
  classId: string
  subjectId: string
  periodsPerWeek?: number | null
  blockType?: string | null
  singlePeriods?: number | null
  doublePeriods?: number | null
  triplePeriods?: number | null
  /** Grade labels when one allocation row represents multiple classes (department workflow). */
  classes?: string[]
}

export type SchedulableUnit = {
  id: string
  teacherId: string
  classId: string
  subjectId: string
  /** Consecutive teaching slots required on the same day (1, 2, or 3). */
  consecutivePeriods: number
  unitType: 'SINGLE' | 'DOUBLE' | 'TRIPLE'
}

export function normalizeAllocationPeriods(allocation: AllocationLike): PeriodBreakdown {
  let singles = Math.max(0, Number(allocation.singlePeriods) || 0)
  let doubles = Math.max(0, Number(allocation.doublePeriods) || 0)
  let triples = Math.max(0, Number(allocation.triplePeriods) || 0)
  const ppw = Math.max(0, Number(allocation.periodsPerWeek) || 0)

  const computed = singles + doubles * 2 + triples * 3
  if (computed > 0) {
    // Legacy p4 stored singles:1 + doubles:2 with periodsPerWeek:4 (5 ≠ 4). Prefer ppw.
    if (!(ppw > 0 && computed !== ppw)) {
      return { singles, doubles, triples, totalPeriods: computed }
    }
    singles = 0
    doubles = 0
    triples = 0
  }

  if (ppw <= 0) {
    return { singles: 1, doubles: 0, triples: 0, totalPeriods: 1 }
  }

  const bt = String(allocation.blockType || 'SINGLE')
    .trim()
    .toUpperCase()

  if (bt === 'DOUBLE' && ppw % 2 === 0) {
    doubles = ppw / 2
  } else if (bt === 'TRIPLE' && ppw % 3 === 0) {
    triples = ppw / 3
  } else if (bt === 'SINGLE') {
    singles = ppw
  } else if (bt === 'MIXED') {
    // Common Zambian secondary: 6 periods = 3 doubles
    if (ppw === 6) doubles = 3
    else if (ppw === 5) {
      doubles = 1
      triples = 1
    } else if (ppw === 4) {
      doubles = 2
    } else {
      singles = ppw
    }
  } else if (ppw % 2 === 0) {
    doubles = ppw / 2
  } else {
    singles = ppw
  }

  return {
    singles,
    doubles,
    triples,
    totalPeriods: singles + doubles * 2 + triples * 3,
  }
}

export function expandAllocationToUnits(
  allocation: AllocationLike,
  idPrefix?: string
): SchedulableUnit[] {
  const base = idPrefix || String(allocation.id || 'alloc')
  const { singles, doubles, triples } = normalizeAllocationPeriods(allocation)
  const units: SchedulableUnit[] = []

  for (let i = 0; i < triples; i++) {
    units.push({
      id: `${base}-t${i + 1}`,
      teacherId: allocation.teacherId,
      classId: allocation.classId,
      subjectId: allocation.subjectId,
      consecutivePeriods: 3,
      unitType: 'TRIPLE',
    })
  }
  for (let i = 0; i < doubles; i++) {
    units.push({
      id: `${base}-d${i + 1}`,
      teacherId: allocation.teacherId,
      classId: allocation.classId,
      subjectId: allocation.subjectId,
      consecutivePeriods: 2,
      unitType: 'DOUBLE',
    })
  }
  for (let i = 0; i < singles; i++) {
    units.push({
      id: `${base}-s${i + 1}`,
      teacherId: allocation.teacherId,
      classId: allocation.classId,
      subjectId: allocation.subjectId,
      consecutivePeriods: 1,
      unitType: 'SINGLE',
    })
  }

  return units
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/** Class targets for expansion — fan-out only when one row carries multiple class UUIDs. */
export function resolveAllocationClassIds(
  allocation: AllocationLike & { classes?: string[] }
): string[] {
  const classId = String(allocation.classId || '').trim()
  const classes = allocation.classes

  if (Array.isArray(classes) && classes.length > 1 && classes.every((c) => isUuid(String(c)))) {
    return classes.map((c) => String(c))
  }

  return classId ? [classId] : []
}

/** Expand period config into one block set per class (multi-grade HOD submissions). */
export function expandAllocationToUnitsForAllClasses(
  allocation: AllocationLike & { classes?: string[] },
  idPrefix?: string
): SchedulableUnit[] {
  const classIds = resolveAllocationClassIds(allocation)
  if (classIds.length === 0) return []

  const base = idPrefix || String(allocation.id || 'alloc')
  const units: SchedulableUnit[] = []

  for (const classId of classIds) {
    const perClass = expandAllocationToUnits({ ...allocation, classId }, `${base}-${classId}`)
    units.push(...perClass)
  }

  return units
}

export type RecipeBlockLike = {
  id?: string
  size?: number
  quantity?: number
}

export type RecipeLike = {
  id: string
  teachingAssignmentId?: string | null
  teacherId: string
  classId: string
  subjectId: string
  expectedPeriodsPerWeek?: number | null
  blocks?: RecipeBlockLike[]
}

export function expandRecipeToUnits(recipe: RecipeLike): SchedulableUnit[] {
  const base = String(recipe.teachingAssignmentId || recipe.id)
  const units: SchedulableUnit[] = []

  if (Array.isArray(recipe.blocks) && recipe.blocks.length) {
    let idx = 0
    for (const block of recipe.blocks) {
      const size = Math.max(1, Math.min(3, Number(block.size) || 1))
      const qty = Math.max(1, Number(block.quantity) || 1)
      const unitType = size >= 3 ? 'TRIPLE' : size === 2 ? 'DOUBLE' : 'SINGLE'
      for (let q = 0; q < qty; q++) {
        idx += 1
        units.push({
          id: `${base}-b${idx}`,
          teacherId: recipe.teacherId,
          classId: recipe.classId,
          subjectId: recipe.subjectId,
          consecutivePeriods: size,
          unitType,
        })
      }
    }
    return units
  }

  const ppw = Math.max(1, Number(recipe.expectedPeriodsPerWeek) || 1)
  return expandAllocationToUnits(
    {
      id: base,
      teacherId: recipe.teacherId,
      classId: recipe.classId,
      subjectId: recipe.subjectId,
      periodsPerWeek: ppw,
      blockType: ppw % 2 === 0 ? 'DOUBLE' : 'SINGLE',
    },
    base
  )
}

export type TeachingAssignmentLike = {
  id: string
  teacherId: string
  classId: string
  subjectId: string
}

export function resolveSchedulableUnits(params: {
  teachingAssignments?: TeachingAssignmentLike[]
  recipes?: RecipeLike[]
  allocations?: AllocationLike[]
}): SchedulableUnit[] {
  const recipes = params.recipes || []
  const assignments = params.teachingAssignments || []
  const allocations = params.allocations || []

  const recipeByTa = new Map<string, RecipeLike>()
  for (const r of recipes) {
    if (r.teachingAssignmentId) recipeByTa.set(String(r.teachingAssignmentId), r)
  }

  const allocKey = (a: AllocationLike) => `${a.teacherId}|${a.classId}|${a.subjectId}`
  const allocationByKey = new Map<string, AllocationLike>()
  for (const a of allocations) {
    allocationByKey.set(allocKey(a), a)
  }

  const out: SchedulableUnit[] = []
  const seen = new Set<string>()

  const pushUnits = (units: SchedulableUnit[]) => {
    for (const u of units) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      out.push(u)
    }
  }

  if (assignments.length) {
    for (const ta of assignments) {
      const recipe = recipeByTa.get(String(ta.id))
      if (recipe) {
        pushUnits(expandRecipeToUnits(recipe))
        continue
      }
      const alloc = allocationByKey.get(`${ta.teacherId}|${ta.classId}|${ta.subjectId}`)
      if (alloc) {
        pushUnits(expandAllocationToUnits(alloc, String(ta.id)))
      } else {
        pushUnits(
          expandAllocationToUnits(
            {
              id: ta.id,
              teacherId: ta.teacherId,
              classId: ta.classId,
              subjectId: ta.subjectId,
              periodsPerWeek: 1,
              blockType: 'SINGLE',
            },
            ta.id
          )
        )
      }
    }
  } else if (recipes.length) {
    for (const r of recipes) {
      pushUnits(expandRecipeToUnits(r))
    }
  } else if (allocations.length) {
    for (const a of allocations) {
      pushUnits(expandAllocationToUnitsForAllClasses(a))
    }
  }

  return out
}
