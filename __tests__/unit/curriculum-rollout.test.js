import { describe, expect, it } from 'vitest'
import {
  buildCurriculumRolloutRows,
  resolveSyllabusVersionForYear,
} from '@/lib/curriculum/curriculumRollout'

describe('curriculumRollout', () => {
  it('flips SS1→2027, SS2→2028, SS3→2029 to CBC', () => {
    expect(resolveSyllabusVersionForYear(1, 2026)).toBe('OLD_SYLLABUS')
    expect(resolveSyllabusVersionForYear(1, 2027)).toBe('CBC')
    expect(resolveSyllabusVersionForYear(2, 2027)).toBe('OLD_SYLLABUS')
    expect(resolveSyllabusVersionForYear(2, 2028)).toBe('CBC')
    expect(resolveSyllabusVersionForYear(3, 2028)).toBe('OLD_SYLLABUS')
    expect(resolveSyllabusVersionForYear(3, 2029)).toBe('CBC')
  })

  it('seeds Phase 1 gate rows correctly', () => {
    const rows = buildCurriculumRolloutRows()
    const lookup = (level, year) =>
      rows.find((r) => r.canonicalLevel === level && r.academicYear === year)

    expect(lookup('SS1', 2027)?.syllabusVersion).toBe('CBC')
    expect(lookup('SS2', 2027)?.syllabusVersion).toBe('OLD_SYLLABUS')
    expect(lookup('SS3', 2028)?.syllabusVersion).toBe('OLD_SYLLABUS')
    expect(lookup('SS3', 2029)?.syllabusVersion).toBe('CBC')

    expect(lookup('SS1', 2027)?.displayLabel).toBe('Grade 10')
    expect(lookup('SS1', 2029)?.displayLabel).toBe('Form 1')
  })
})
