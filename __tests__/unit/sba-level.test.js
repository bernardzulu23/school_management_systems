import { describe, expect, it } from 'vitest'
import {
  levelAtOrAbove,
  secondaryLevelRank,
  yearGroupToCanonicalLevel,
} from '@/lib/sba/levelComparator'
import { SBA_ENTRY_START_YEAR, assertSbaEntryYear } from '@/lib/sba/constants'

describe('sba levelComparator', () => {
  it('ranks Form and SS labels consistently', () => {
    expect(secondaryLevelRank('Form 1')).toBe(1)
    expect(secondaryLevelRank('SS1')).toBe(1)
    expect(secondaryLevelRank('Form 2')).toBe(2)
    expect(secondaryLevelRank('Grade 11')).toBe(2)
    expect(secondaryLevelRank('Form 4')).toBe(4)
  })

  it('compares startsAtLevel Form 2', () => {
    expect(levelAtOrAbove('Form 1', 'Form 2')).toBe(false)
    expect(levelAtOrAbove('Form 2', 'Form 2')).toBe(true)
    expect(levelAtOrAbove('SS3', 'Form 2')).toBe(true)
  })

  it('maps year_group to canonical SS level', () => {
    expect(yearGroupToCanonicalLevel('Form 1')).toBe('SS1')
    expect(yearGroupToCanonicalLevel('Form 2')).toBe('SS2')
    expect(yearGroupToCanonicalLevel('Form 3')).toBe('SS3')
  })
})

describe('sba entry year', () => {
  it('gates years before 2026', () => {
    expect(SBA_ENTRY_START_YEAR).toBe(2026)
    expect(() => assertSbaEntryYear(2025)).toThrow(/2026/)
    expect(assertSbaEntryYear(2026)).toBe(2026)
  })
})
