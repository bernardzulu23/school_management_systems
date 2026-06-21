import { describe, expect, it } from 'vitest'
import { formatPeriodConfigLabel } from '../formatPeriodConfig'

describe('formatPeriodConfigLabel', () => {
  it('shows total periods when a teacher has multiple classes', () => {
    const label = formatPeriodConfigLabel(
      { preset: 'p6' },
      {
        classes: ['10A', '10B', '10C'],
      }
    )
    expect(label).toBe('18 periods total (6 per class × 3 classes)')
  })

  it('keeps per-class label for a single class', () => {
    const label = formatPeriodConfigLabel({ preset: 'p6' }, { classes: ['10A'] })
    expect(label).toBe('6 periods per week (3 doubles)')
  })
})
