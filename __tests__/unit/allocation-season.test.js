import { describe, expect, it } from 'vitest'
import { resolveAllocationSeason } from '@/lib/timetable/allocationSeason'

describe('resolveAllocationSeason', () => {
  it('prefers term/year stored on the allocation payload', () => {
    expect(
      resolveAllocationSeason(
        { term: 'Term 2', academicYear: '2025' },
        { term: 'Term 1', academicYear: '2026' }
      )
    ).toEqual({ term: 'Term 2', academicYear: '2025' })
  })

  it('falls back to request body when allocation payload has no season', () => {
    expect(
      resolveAllocationSeason({ subject: 'Math' }, { term: 'Term 3', academicYear: '2024' })
    ).toEqual({ term: 'Term 3', academicYear: '2024' })
  })

  it('defaults when neither payload nor body provides season', () => {
    const result = resolveAllocationSeason({}, {})
    expect(result.term).toBe('Term 1')
    expect(result.academicYear).toBe(String(new Date().getFullYear()))
  })
})
