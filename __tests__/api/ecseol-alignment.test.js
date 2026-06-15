/**
 * ECSEOL alignment — assessment engine and validation rules.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeQuestionsForMode,
  validateExamItem,
  validateBloomDistribution,
  hasZambianContext,
  ASSESSMENT_MODES,
} from '@/lib/ecz/assessment-engine'

describe('ECSEOL secondary assessment rules', () => {
  it('strips all MCQ from normalized secondary quiz output', () => {
    const input = [
      { type: 'mcq', question: 'Pick A' },
      { type: 'mcq', question: 'Pick B' },
      { type: 'structured', question: 'Explain soil erosion in Mkushi district farming.' },
    ]
    const out = normalizeQuestionsForMode(input, ASSESSMENT_MODES.SECONDARY_SCENARIO)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('structured')
  })

  it('requires Zambian context on exam scenarios when enforced', () => {
    const bad = validateExamItem(
      { type: 'structured', question: 'Explain photosynthesis in general terms only.' },
      ASSESSMENT_MODES.SECONDARY_SCENARIO,
      { requireZambianContext: true }
    )
    expect(bad.ok).toBe(false)

    const good = validateExamItem(
      {
        type: 'scenario',
        zambianScenario:
          'A maize farmer in Mkushi Province observes yellow leaves after a dry spell.',
        elementOfConstruct: 'Plant nutrition',
      },
      ASSESSMENT_MODES.SECONDARY_SCENARIO,
      { requireZambianContext: true, requireEoC: true }
    )
    expect(good.ok).toBe(true)
  })

  it('detects Zambian context keywords', () => {
    expect(hasZambianContext('Market traders in Lusaka sell nshima daily.')).toBe(true)
    expect(hasZambianContext('Generic science question.')).toBe(false)
  })

  it('warns on skewed Bloom distribution', () => {
    const result = validateBloomDistribution([
      { bloomsLevel: 'Remembering', marks: 80 },
      { bloomsLevel: 'Creating', marks: 5 },
    ])
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
