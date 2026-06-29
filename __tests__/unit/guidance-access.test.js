import { describe, it, expect } from 'vitest'
import {
  normalizeGuidanceScope,
  formatGuidanceScopeLabel,
  hasGuidanceAssignment,
  isSchoolAdminOrHead,
} from '@/lib/guidance/guidanceAccess'

describe('guidanceAccess', () => {
  it('normalizes guidance scope values', () => {
    expect(normalizeGuidanceScope('junior')).toBe('JUNIOR')
    expect(normalizeGuidanceScope('invalid')).toBe('ALL')
  })

  it('formats scope labels for UI', () => {
    expect(formatGuidanceScopeLabel('SENIOR')).toContain('Senior')
    expect(formatGuidanceScopeLabel('ALL')).toBe('All pupils')
  })

  it('detects active guidance assignment on user session', () => {
    expect(hasGuidanceAssignment({ guidanceAssignment: { id: 'a1', active: true } })).toBe(true)
    expect(
      hasGuidanceAssignment({ guidanceAssignment: { id: 'a1', active: true, revokedAt: null } })
    ).toBe(true)
    expect(
      hasGuidanceAssignment({
        guidanceAssignment: { id: 'a1', active: true, revokedAt: '2026-01-01' },
      })
    ).toBe(false)
    expect(hasGuidanceAssignment({ guidanceAssignment: { active: false } })).toBe(false)
    expect(hasGuidanceAssignment({})).toBe(false)
  })

  it('treats headteacher as school admin for guidance management', () => {
    expect(isSchoolAdminOrHead({ role: 'headteacher' })).toBe(true)
    expect(isSchoolAdminOrHead({ role: 'teacher' })).toBe(false)
  })
})
