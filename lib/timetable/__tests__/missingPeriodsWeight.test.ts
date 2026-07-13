import { describe, expect, it } from 'vitest'
import {
  countPlacedPeriodWeight,
  resolveExpectedPeriods,
  buildAllocationReviewHref,
} from '@/lib/timetable/conflictAudit'

describe('MISSING_PERIODS period weighting', () => {
  it('resolves expected from custom singles/doubles/triples like generation', () => {
    expect(
      resolveExpectedPeriods({
        periodsPerWeek: 3,
        singlePeriods: 1,
        doublePeriods: 1,
        triplePeriods: 0,
        blockType: 'MIXED',
      })
    ).toBe(3)

    expect(
      resolveExpectedPeriods({
        periodsPerWeek: 6,
        singlePeriods: 0,
        doublePeriods: 3,
        triplePeriods: 0,
        blockType: 'DOUBLE',
      })
    ).toBe(6)
  })

  it('counts a double + single as 3 periods (not 2 rows)', () => {
    const placed = countPlacedPeriodWeight(
      [
        { allocationId: 'a1', periodType: 'DOUBLE', durationMin: 80 },
        { allocationId: 'a1', periodType: 'SINGLE', durationMin: 40 },
        { allocationId: 'other', periodType: 'SINGLE', durationMin: 40 },
      ],
      'a1'
    )
    expect(placed).toBe(3)
  })

  it('does not flag missing when double+single fills a 3-period custom allocation', () => {
    const expected = resolveExpectedPeriods({
      periodsPerWeek: 3,
      singlePeriods: 1,
      doublePeriods: 1,
      triplePeriods: 0,
    })
    const placed = countPlacedPeriodWeight(
      [
        { allocationId: 'chem', periodType: 'DOUBLE', durationMin: 80 },
        { allocationId: 'chem', periodType: 'SINGLE', durationMin: 40 },
      ],
      'chem'
    )
    expect(placed).toBeGreaterThanOrEqual(expected)
  })

  it('builds a headteacher allocations deep link', () => {
    const href = buildAllocationReviewHref({
      className: '12A',
      subjectName: 'Chemistry',
      teacherName: 'BWALYA TEDDY CHISENGA',
      term: 'Term 1',
      academicYear: '2026',
    })
    expect(href).toContain('tab=allocations')
    expect(href).toContain('focusClass=12A')
    expect(href).toContain('focusSubject=Chemistry')
  })
})
