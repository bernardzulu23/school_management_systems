import { describe, it, expect } from 'vitest'
import {
  getSchoolFeatures,
  isGovernment,
  isPrivate,
  isGovernmentSchool,
  isPrivateSchool,
  canUseCBC,
  canUseECZSBA,
  canUseFeeManagement,
  canUseTeacherLeave,
  GOVERNMENT_ONLY_FEATURES,
  canUseFeatureByLevel,
  canUseFeatureByOwnership,
} from '@/lib/school/schoolTypeHelpers'

describe('schoolTypeHelpers', () => {
  it('primary + GOVERNMENT: CBC on, ECZ off, fees off', () => {
    const school = { level: 'primary', ownershipType: 'GOVERNMENT' }
    const f = getSchoolFeatures(school)

    expect(isGovernment(school)).toBe(true)
    expect(isPrivate(school)).toBe(false)
    expect(f.cbc).toBe(true)
    expect(f.eczSBA).toBe(false)
    expect(f.feeManagement).toBe(false)
    expect(f.hod).toBe(false)
  })

  it('secondary + PRIVATE: ECZ on, CBC off, fees on', () => {
    const school = { level: 'secondary', ownershipType: 'PRIVATE' }
    const f = getSchoolFeatures(school)

    expect(f.cbc).toBe(false)
    expect(f.eczSBA).toBe(true)
    expect(f.feeManagement).toBe(true)
    expect(f.hostel).toBe(true)
  })

  it('combined + GRANT_AIDED: both curricula, private finance', () => {
    const school = { level: 'combined', ownershipType: 'GRANT_AIDED' }
    const f = getSchoolFeatures(school)

    expect(isPrivate(school)).toBe(true)
    expect(f.cbc).toBe(true)
    expect(f.eczSBA).toBe(true)
    expect(f.feeManagement).toBe(true)
    expect(f.isCombined).toBe(true)
  })

  it('primary + COMMUNITY: government profile', () => {
    const school = { level: 'primary', ownershipType: 'COMMUNITY' }
    const f = getSchoolFeatures(school)

    expect(isGovernment(school)).toBe(true)
    expect(f.emisExport).toBe(true)
    expect(f.feeManagement).toBe(false)
  })

  it('canUseFeatureByLevel blocks ECZ on primary', () => {
    expect(canUseFeatureByLevel('primary', 'ecz-practice')).toBe(false)
    expect(canUseFeatureByLevel('combined', 'ecz-practice')).toBe(true)
    expect(canUseFeatureByLevel('primary', 'continuous-assessment-tool')).toBe(true)
  })

  it('canUseFeatureByOwnership blocks fees for government', () => {
    expect(canUseFeatureByOwnership('GOVERNMENT', 'fee-management')).toBe(false)
    expect(canUseFeatureByOwnership('PRIVATE', 'fee-management')).toBe(true)
    expect(canUseFeatureByOwnership('GRANT_AIDED', 'school-fees-management')).toBe(true)
  })

  it('GOVERNMENT_ONLY_FEATURES and teacher-leave are government-only', () => {
    expect(GOVERNMENT_ONLY_FEATURES).toContain('teacher-leave')
    expect(GOVERNMENT_ONLY_FEATURES).toContain('emis-export')
    expect(canUseFeatureByOwnership('GOVERNMENT', 'teacher-leave')).toBe(true)
    expect(canUseFeatureByOwnership('PRIVATE', 'teacher-leave')).toBe(false)
    expect(canUseFeatureByOwnership('GOVERNMENT', 'gender-dropout-report')).toBe(true)
  })

  it('ownership aliases delegate to isGovernment/isPrivate', () => {
    expect(isGovernmentSchool('GOVERNMENT')).toBe(true)
    expect(isGovernmentSchool('COMMUNITY')).toBe(true)
    expect(isPrivateSchool('PRIVATE')).toBe(true)
    expect(isPrivateSchool('GRANT_AIDED')).toBe(true)
  })

  it('canUseTeacherLeave and getSchoolFeatures.teacherLeave for government', () => {
    const govt = { level: 'primary', ownershipType: 'GOVERNMENT' }
    expect(canUseTeacherLeave(govt)).toBe(true)
    expect(getSchoolFeatures(govt).teacherLeave).toBe(true)
    expect(getSchoolFeatures({ ownershipType: 'PRIVATE' }).teacherLeave).toBe(false)
  })
})
