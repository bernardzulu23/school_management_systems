import { describe, expect, it } from 'vitest'
import { resolveSchoolSectionFlags } from '@/lib/school/resolveSchoolSectionFlags'

describe('resolveSchoolSectionFlags', () => {
  it('forces no primary for secondary level', () => {
    expect(
      resolveSchoolSectionFlags({ level: 'secondary' }, [
        { year_group: 'Grade 5', name: 'Grade 5A' },
      ])
    ).toEqual({ hasPrimary: false, hasSecondary: true, level: 'secondary' })
  })

  it('refines combined with only Form classes to secondary-only', () => {
    expect(
      resolveSchoolSectionFlags({ level: 'combined' }, [
        { year_group: 'Form 1', name: 'Form 1A' },
        { year_group: 'Form 2', name: 'Form 2B' },
      ])
    ).toEqual({ hasPrimary: false, hasSecondary: true, level: 'combined' })
  })

  it('keeps both sections for combined with Grade and Form classes', () => {
    expect(
      resolveSchoolSectionFlags({ level: 'combined' }, [
        { year_group: 'Grade 5', name: 'Grade 5A' },
        { year_group: 'Form 1', name: 'Form 1A' },
      ])
    ).toEqual({ hasPrimary: true, hasSecondary: true, level: 'combined' })
  })
})
