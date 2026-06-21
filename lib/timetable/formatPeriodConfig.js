/** Human-readable weekly period labels (not timetable slot numbers). */

export const PERIOD_PRESET_LABELS = {
  p6: '6 periods per week (3 doubles)',
  p5: '5 periods per week (1 double + 1 triple)',
  p4: '4 periods per week (2 doubles + 1 single)',
}

export function countAllocationClasses(classes) {
  if (Array.isArray(classes)) {
    return classes.map((c) => String(c || '').trim()).filter(Boolean).length
  }
  if (typeof classes === 'string' && classes.trim()) {
    return classes
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean).length
  }
  return 0
}

function weeklyPeriodTotal(periodConfig) {
  if (!periodConfig || typeof periodConfig !== 'object') return 0

  const preset = String(periodConfig?.preset || '')
    .trim()
    .toLowerCase()
  if (preset === 'p6') return 6
  if (preset === 'p5') return 5
  if (preset === 'p4') return 4

  const singles = Math.max(0, Number(periodConfig?.singles || 0))
  const doubles = Math.max(0, Number(periodConfig?.doubles || 0))
  const triples = Math.max(0, Number(periodConfig?.triples || 0))
  const explicit = Number(periodConfig?.periods)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  return singles + doubles * 2 + triples * 3
}

function withClassTotal(baseLabel, weeklyTotal, classCount) {
  const count = Math.max(0, Number(classCount || 0))
  const perClass = Math.max(0, Number(weeklyTotal || 0))
  if (count <= 1 || perClass <= 0) return baseLabel
  const totalAll = perClass * count
  return `${totalAll} periods total (${perClass} per class × ${count} classes)`
}

export function formatPeriodConfigLabel(periodConfig, opts = {}) {
  const classCount =
    countAllocationClasses(opts.classes) || Math.max(0, Number(opts.classCount || 0))

  if (!periodConfig) return ''
  if (typeof periodConfig === 'string') {
    const trimmed = periodConfig.trim()
    if (trimmed.startsWith('{')) {
      try {
        return formatPeriodConfigLabel(JSON.parse(trimmed), opts)
      } catch {
        return trimmed
      }
    }
    return trimmed
  }

  const preset = String(periodConfig?.preset || '')
    .trim()
    .toLowerCase()
  if (periodConfig?.label && typeof periodConfig.label === 'string') {
    const label = periodConfig.label.trim()
    if (label && !label.startsWith('{')) {
      const total = weeklyPeriodTotal(periodConfig)
      return withClassTotal(label, total, classCount)
    }
  }
  if (preset && PERIOD_PRESET_LABELS[preset]) {
    return withClassTotal(PERIOD_PRESET_LABELS[preset], weeklyPeriodTotal(periodConfig), classCount)
  }

  const singles = Math.max(0, Number(periodConfig?.singles || 0))
  const doubles = Math.max(0, Number(periodConfig?.doubles || 0))
  const triples = Math.max(0, Number(periodConfig?.triples || 0))
  const total = weeklyPeriodTotal(periodConfig)

  if (total <= 0) return ''

  const parts = []
  if (doubles) parts.push(`${doubles} double${doubles === 1 ? '' : 's'}`)
  if (triples) parts.push(`${triples} triple${triples === 1 ? '' : 's'}`)
  if (singles) parts.push(`${singles} single${singles === 1 ? '' : 's'}`)

  const base = parts.length
    ? `${total} periods per week (${parts.join(', ')})`
    : `${total} periods per week`

  return withClassTotal(base, total, classCount)
}
