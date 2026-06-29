import { currentTermLabel, termDateRange } from '@/lib/academic/currentTerm'

describe('currentTermLabel', () => {
  it('returns Term 1 for Jan–Apr', () => {
    expect(currentTermLabel(new Date('2026-02-15'))).toBe('Term 1')
  })

  it('returns Term 2 for May–Aug', () => {
    expect(currentTermLabel(new Date('2026-06-25'))).toBe('Term 2')
  })

  it('returns Term 3 for Sep–Dec', () => {
    expect(currentTermLabel(new Date('2026-11-10'))).toBe('Term 3')
  })
})

describe('termDateRange', () => {
  it('covers Term 2 within the calendar year', () => {
    const { start, end } = termDateRange('Term 2', 2026)
    expect(start.getMonth()).toBe(4)
    expect(end.getMonth()).toBe(7)
  })
})
