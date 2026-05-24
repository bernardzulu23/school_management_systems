/** Human-readable weekly period labels (not timetable slot numbers). */

export const PERIOD_PRESET_LABELS = {
  p6: '6 periods per week (3 doubles)',
  p5: '5 periods per week (1 double + 1 triple)',
  p4: '4 periods per week (2 doubles + 1 single)',
}

export function formatPeriodConfigLabel(periodConfig) {
  if (!periodConfig) return ''
  if (typeof periodConfig === 'string') {
    const trimmed = periodConfig.trim()
    if (trimmed.startsWith('{')) {
      try {
        return formatPeriodConfigLabel(JSON.parse(trimmed))
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
    if (label && !label.startsWith('{')) return label
  }
  if (preset && PERIOD_PRESET_LABELS[preset]) {
    return PERIOD_PRESET_LABELS[preset]
  }

  const singles = Math.max(0, Number(periodConfig?.singles || 0))
  const doubles = Math.max(0, Number(periodConfig?.doubles || 0))
  const triples = Math.max(0, Number(periodConfig?.triples || 0))
  const total =
    Number(periodConfig?.periods) > 0
      ? Number(periodConfig.periods)
      : singles + doubles * 2 + triples * 3

  if (total <= 0) return ''

  const parts = []
  if (doubles) parts.push(`${doubles} double${doubles === 1 ? '' : 's'}`)
  if (triples) parts.push(`${triples} triple${triples === 1 ? '' : 's'}`)
  if (singles) parts.push(`${singles} single${singles === 1 ? '' : 's'}`)

  if (parts.length) {
    return `${total} periods per week (${parts.join(', ')})`
  }
  return `${total} periods per week`
}
