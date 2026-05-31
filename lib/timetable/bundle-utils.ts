/**
 * Period bundle helpers for HOD allocation submissions.
 * A bundle splits total_periods_per_week into singles (1×40min), doubles (2×), triples (3×).
 */

export type AllocationBundle = {
  singles: number
  doubles: number
  triples: number
}

export function validateBundle(bundle: AllocationBundle, totalPeriods: number): boolean {
  const computed =
    (Number(bundle.doubles) || 0) * 2 +
    (Number(bundle.singles) || 0) * 1 +
    (Number(bundle.triples) || 0) * 3
  return computed === Number(totalPeriods)
}

export function bundleFromAllocationFields(input: {
  singlePeriods?: number | null
  doublePeriods?: number | null
  triplePeriods?: number | null
}): AllocationBundle {
  return {
    singles: Math.max(0, Number(input.singlePeriods) || 0),
    doubles: Math.max(0, Number(input.doublePeriods) || 0),
    triples: Math.max(0, Number(input.triplePeriods) || 0),
  }
}

/**
 * Default bundle when HOD does not specify a custom split.
 * Prefers doubles (Zambian secondary convention: 6 periods → 3 doubles).
 */
export function autoBundleSplit(total: number): AllocationBundle {
  const t = Math.max(0, Math.floor(Number(total) || 0))
  if (t === 0) return { singles: 0, doubles: 0, triples: 0 }
  if (t === 3) return { triples: 1, doubles: 0, singles: 0 }
  if (t === 6) return { triples: 0, doubles: 3, singles: 0 }
  if (t === 9) return { triples: 0, doubles: 4, singles: 1 }
  const doubles = Math.floor(t / 2)
  const singles = t % 2
  return { triples: 0, doubles, singles }
}

export function bundleErrorMessage(bundle: AllocationBundle, totalPeriods: number): string {
  const computed = bundle.doubles * 2 + bundle.singles + bundle.triples * 3
  return `Bundle periods (${computed}) do not match total_periods_per_week (${totalPeriods})`
}

/** Accept API alias `period_bundle` or explicit single/double/triple fields. */
export function resolveBundleFromBody(
  body: Record<string, unknown>,
  periodsPerWeek: number
): {
  bundle: AllocationBundle
  error?: string
} {
  const raw = body.period_bundle ?? body.periodBundle
  if (raw && typeof raw === 'object') {
    const b = raw as Record<string, unknown>
    const bundle: AllocationBundle = {
      doubles: Math.max(0, Number(b.doubles) || 0),
      singles: Math.max(0, Number(b.singles) || 0),
      triples: Math.max(0, Number(b.triples) || 0),
    }
    if (!validateBundle(bundle, periodsPerWeek)) {
      return { bundle, error: bundleErrorMessage(bundle, periodsPerWeek) }
    }
    return { bundle }
  }

  const hasExplicit =
    body.singlePeriods != null || body.doublePeriods != null || body.triplePeriods != null

  if (hasExplicit) {
    const bundle = bundleFromAllocationFields({
      singlePeriods: body.singlePeriods as number,
      doublePeriods: body.doublePeriods as number,
      triplePeriods: body.triplePeriods as number,
    })
    if (!validateBundle(bundle, periodsPerWeek)) {
      return { bundle, error: bundleErrorMessage(bundle, periodsPerWeek) }
    }
    return { bundle }
  }

  const blockType = String(body.blockType || 'MIXED')
    .trim()
    .toUpperCase()
  if (blockType === 'SINGLE') {
    return { bundle: { singles: periodsPerWeek, doubles: 0, triples: 0 } }
  }
  if (blockType === 'DOUBLE') {
    if (periodsPerWeek % 2 !== 0) {
      return {
        bundle: { singles: 0, doubles: 0, triples: 0 },
        error: 'DOUBLE blockType requires an even number of periods',
      }
    }
    return { bundle: { singles: 0, doubles: periodsPerWeek / 2, triples: 0 } }
  }
  if (blockType === 'TRIPLE') {
    if (periodsPerWeek % 3 !== 0) {
      return {
        bundle: { singles: 0, doubles: 0, triples: 0 },
        error: 'TRIPLE blockType requires periods divisible by 3',
      }
    }
    return { bundle: { singles: 0, doubles: 0, triples: periodsPerWeek / 3 } }
  }

  return { bundle: autoBundleSplit(periodsPerWeek) }
}
