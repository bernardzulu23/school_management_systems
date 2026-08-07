import { describe, expect, it } from 'vitest'
import {
  buildCurriculumRolloutRows,
  resolveSyllabusVersionForYear,
} from '@/lib/curriculum/curriculumRollout'

describe('curriculumRollout', () => {
  it('flips SS1→2025, SS2→2026, SS3→2027 to CBC (MoE Form 1 2025 cohort)', () => {
    expect(resolveSyllabusVersionForYear(1, 2024)).toBe('OLD_SYLLABUS')
    expect(resolveSyllabusVersionForYear(1, 2025)).toBe('CBC')
    expect(resolveSyllabusVersionForYear(2, 2025)).toBe('OLD_SYLLABUS')
    expect(resolveSyllabusVersionForYear(2, 2026)).toBe('CBC')
    expect(resolveSyllabusVersionForYear(3, 2026)).toBe('OLD_SYLLABUS')
    expect(resolveSyllabusVersionForYear(3, 2027)).toBe('CBC')
  })

  it('seeds Phase 1 gate rows correctly for SBA entry year 2026', () => {
    const rows = buildCurriculumRolloutRows()
    const lookup = (level, year) =>
      rows.find((r) => r.canonicalLevel === level && r.academicYear === year)

    expect(lookup('SS1', 2025)?.syllabusVersion).toBe('CBC')
    expect(lookup('SS2', 2026)?.syllabusVersion).toBe('CBC')
    expect(lookup('SS2', 2025)?.syllabusVersion).toBe('OLD_SYLLABUS')
    expect(lookup('SS3', 2026)?.syllabusVersion).toBe('OLD_SYLLABUS')
    expect(lookup('SS3', 2027)?.syllabusVersion).toBe('CBC')

    expect(lookup('SS1', 2025)?.displayLabel).toBe('Form 1')
    expect(lookup('SS2', 2026)?.displayLabel).toBe('Form 2')
  })
})
