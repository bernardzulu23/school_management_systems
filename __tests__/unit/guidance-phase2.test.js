import { describe, it, expect } from 'vitest'
import { pupilGradeBand, matchesGuidanceScope } from '@/lib/guidance/pupilScope'
import { suppressCount, buildTermlyCategoryCounts } from '@/lib/guidance/caseAccess'

describe('pupilScope', () => {
  it('classifies senior secondary classes', () => {
    expect(pupilGradeBand('Grade 10A')).toBe('SENIOR')
    expect(pupilGradeBand('Form 5B')).toBe('SENIOR')
  })

  it('classifies junior secondary classes', () => {
    expect(pupilGradeBand('Form 1A')).toBe('JUNIOR')
    expect(pupilGradeBand('Form 4C')).toBe('JUNIOR')
  })

  it('filters by guidance scope', () => {
    expect(matchesGuidanceScope('Form 1A', 'JUNIOR')).toBe(true)
    expect(matchesGuidanceScope('Grade 10A', 'JUNIOR')).toBe(false)
    expect(matchesGuidanceScope('Grade 10A', 'ALL')).toBe(true)
  })
})

describe('guidance reports', () => {
  it('suppresses small counts', () => {
    expect(suppressCount(2)).toBe('<3')
    expect(suppressCount(5)).toBe('5')
  })

  it('excludes safeguarding from termly aggregates', () => {
    const rows = buildTermlyCategoryCounts([
      { category: 'CAREER', confidentiality: 'STANDARD', pupil: { class: 'Form 1A' } },
      { category: 'CAREER', confidentiality: 'SAFEGUARDING', pupil: { class: 'Form 1B' } },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].count).toBe(1)
    expect(rows[0].display).toBe('<3')
  })
})
