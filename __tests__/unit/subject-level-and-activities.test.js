import { describe, it, expect } from 'vitest'
import {
  resolveSubjectCatalog,
  resolveEducationLevelFromGrade,
  canAccessEczFeatures,
  canAccessHodFeatures,
  canAccessSecondaryGrading,
  getSubjectLimits,
} from '@/lib/subjects/resolveSubjectCatalog'
import { PRIMARY_SUBJECTS } from '@/data/subjects-primary'
import { SECONDARY_SUBJECTS } from '@/data/subjects-secondary'
import { canEditActivity, canManageAnyActivity, ACTIVITY_TYPES } from '@/lib/activities/helpers'
import { canUseFeature } from '@/lib/zambiaSchoolFeatures'

describe('resolveSubjectCatalog', () => {
  it('returns primary-only catalog for primary schools', () => {
    const { educationLevel, subjects } = resolveSubjectCatalog({ schoolLevel: 'primary' })
    expect(educationLevel).toBe('primary')
    expect(subjects).toHaveLength(PRIMARY_SUBJECTS.length)
    expect(subjects.some((s) => s.name === 'Physics')).toBe(false)
    expect(subjects.some((s) => s.name === 'Integrated Science')).toBe(true)
  })

  it('returns secondary catalog for secondary schools', () => {
    const { educationLevel, subjects } = resolveSubjectCatalog({ schoolLevel: 'secondary' })
    expect(educationLevel).toBe('secondary')
    expect(subjects.length).toBe(SECONDARY_SUBJECTS.length)
    expect(subjects.some((s) => s.name === 'Physics')).toBe(true)
    expect(subjects.some((s) => s.name === 'Special Paper 1')).toBe(false)
  })

  it('filters combined schools by grade level', () => {
    const primary = resolveSubjectCatalog({
      schoolLevel: 'combined',
      gradeLevel: 'Grade 4',
    })
    expect(primary.educationLevel).toBe('primary')
    expect(primary.subjects.some((s) => s.name === 'Mathematics')).toBe(true)

    const secondary = resolveSubjectCatalog({
      schoolLevel: 'combined',
      gradeLevel: 'Form 2',
    })
    expect(secondary.educationLevel).toBe('secondary')
    expect(secondary.subjects.some((s) => s.name === 'Chemistry')).toBe(true)
  })

  it('filters primary local languages when school enables subset', () => {
    const { subjects } = resolveSubjectCatalog({
      schoolLevel: 'primary',
      enabledLocalLanguages: ['BEM', 'TON'],
    })
    expect(subjects.some((s) => s.name === 'Bemba')).toBe(true)
    expect(subjects.some((s) => s.name === 'Tonga')).toBe(true)
    expect(subjects.some((s) => s.name === 'Lozi')).toBe(false)
  })
})

describe('resolveEducationLevelFromGrade', () => {
  it('maps grades and forms correctly', () => {
    expect(resolveEducationLevelFromGrade('Grade 3')).toBe('primary')
    expect(resolveEducationLevelFromGrade('Grade 9')).toBe('secondary')
    expect(resolveEducationLevelFromGrade('Form 1')).toBe('secondary')
  })
})

describe('getSubjectLimits', () => {
  it('uses wider range for primary learners', () => {
    const primary = getSubjectLimits('primary')
    expect(primary.min).toBeGreaterThanOrEqual(8)
    const secondary = getSubjectLimits('secondary')
    expect(secondary.max).toBeLessThanOrEqual(9)
  })
})

describe('canAccessEczFeatures', () => {
  it('blocks primary schools from ECZ', () => {
    expect(canAccessEczFeatures({ schoolLevel: 'primary' })).toBe(false)
    expect(canAccessEczFeatures({ schoolLevel: 'secondary' })).toBe(true)
    expect(canAccessEczFeatures({ schoolLevel: 'combined', gradeLevel: 'Grade 6' })).toBe(false)
    expect(canAccessEczFeatures({ schoolLevel: 'combined', gradeLevel: 'Form 3' })).toBe(true)
    expect(canAccessEczFeatures({ schoolLevel: 'combined', gradeLevel: 'ECE' })).toBe(false)
  })
})

describe('canAccessHodFeatures', () => {
  it('blocks primary schools from HOD features', () => {
    expect(canAccessHodFeatures({ schoolLevel: 'primary' })).toBe(false)
    expect(canAccessHodFeatures({ schoolLevel: 'secondary' })).toBe(true)
    expect(canAccessHodFeatures({ schoolLevel: 'combined' })).toBe(true)
  })
})

describe('canAccessSecondaryGrading', () => {
  it('mirrors ECZ education-band rules', () => {
    expect(canAccessSecondaryGrading({ schoolLevel: 'primary' })).toBe(false)
    expect(canAccessSecondaryGrading({ schoolLevel: 'secondary' })).toBe(true)
    expect(canAccessSecondaryGrading({ schoolLevel: 'combined', gradeLevel: 'Grade 4' })).toBe(
      false
    )
    expect(canAccessSecondaryGrading({ schoolLevel: 'combined', gradeLevel: 'Grade 10' })).toBe(
      true
    )
    expect(canAccessSecondaryGrading({ schoolLevel: 'combined', gradeLevel: 'Reception' })).toBe(
      false
    )
  })
})

describe('resolveEducationLevelFromGrade ECE', () => {
  it('maps early childhood grades to primary', () => {
    expect(resolveEducationLevelFromGrade('ECE')).toBe('primary')
    expect(resolveEducationLevelFromGrade('Reception')).toBe('primary')
  })
})

describe('canUseFeature secondary-only gating', () => {
  it('blocks secondary-only plan features for primary schools', () => {
    expect(canUseFeature('primary', 'hod-dashboard')).toBe(false)
    expect(canUseFeature('primary', 'basic-results')).toBe(false)
    expect(canUseFeature('primary', 'junior-performance')).toBe(false)
    expect(canUseFeature('secondary', 'basic-results')).toBe(true)
    expect(canUseFeature('combined', 'hod-management')).toBe(true)
  })
})

describe('activity helpers', () => {
  it('allows managers to edit any activity', () => {
    const activity = { organizerId: 'teacher-1' }
    expect(canManageAnyActivity({ role: 'HOD' })).toBe(true)
    expect(canEditActivity({ id: 'teacher-2', role: 'teacher' }, activity)).toBe(false)
    expect(canEditActivity({ id: 'teacher-1', role: 'teacher' }, activity)).toBe(true)
    expect(canEditActivity({ id: 'admin-1', role: 'ADMIN' }, activity)).toBe(true)
  })

  it('defines supported activity types', () => {
    expect(ACTIVITY_TYPES).toContain('club')
    expect(ACTIVITY_TYPES).toContain('sport')
    expect(ACTIVITY_TYPES).toContain('event')
  })
})
