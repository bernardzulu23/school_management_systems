import { describe, expect, it } from 'vitest'
import {
  getResultTypeLabel,
  normalizeResultType,
  RESULT_TYPES,
  SCHOOL_WIDE_RESULT_TYPES,
} from '@/lib/results/resultTypes'

describe('resultTypes', () => {
  it('normalizes common labels', () => {
    expect(normalizeResultType('end of term')).toBe(RESULT_TYPES.END_OF_TERM)
    expect(normalizeResultType('midterm')).toBe(RESULT_TYPES.MIDTERM)
    expect(normalizeResultType('class test')).toBe(RESULT_TYPES.CLASS_TEST)
  })

  it('labels types for UI', () => {
    expect(getResultTypeLabel(RESULT_TYPES.END_OF_TERM)).toBe('End of term')
    expect(getResultTypeLabel(RESULT_TYPES.MIDTERM)).toBe('Midterm')
    expect(getResultTypeLabel(RESULT_TYPES.CLASS_TEST)).toBe('Class test')
  })

  it('limits school-wide views to end of term and midterm', () => {
    expect(SCHOOL_WIDE_RESULT_TYPES).toEqual([RESULT_TYPES.END_OF_TERM, RESULT_TYPES.MIDTERM])
    expect(SCHOOL_WIDE_RESULT_TYPES).not.toContain(RESULT_TYPES.CLASS_TEST)
  })
})
