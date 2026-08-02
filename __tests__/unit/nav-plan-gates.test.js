import { describe, it, expect } from 'vitest'
import { isNavItemApplicable } from '@/lib/school/navApplicability'

describe('isNavItemApplicable plan gates', () => {
  it('hides premium AI report comments on basic', () => {
    expect(
      isNavItemApplicable(
        { name: 'AI Report Comments', requiresPlanFeature: 'ai-report-comments' },
        { plan: 'basic', level: 'secondary' }
      )
    ).toBe(false)
  })

  it('shows SMS on basic', () => {
    expect(
      isNavItemApplicable(
        { name: 'SMS', requiresPlanFeature: 'sms-alerts' },
        { plan: 'basic', level: 'secondary' }
      )
    ).toBe(true)
  })

  it('hides AI tools on basic, shows on standard', () => {
    const item = { name: 'AI Assistant', requiresPlanFeature: 'ai-tools' }
    expect(isNavItemApplicable(item, { plan: 'basic', level: 'secondary' })).toBe(false)
    expect(isNavItemApplicable(item, { plan: 'standard', level: 'secondary' })).toBe(true)
  })

  it('shows report comments on premium only among paid tiers', () => {
    const item = { name: 'AI Report Comments', requiresPlanFeature: 'ai-report-comments' }
    expect(isNavItemApplicable(item, { plan: 'standard', level: 'secondary' })).toBe(false)
    expect(isNavItemApplicable(item, { plan: 'premium', level: 'secondary' })).toBe(true)
  })
})
