import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateEnrollmentCode } from '@/lib/utils/enrollment-code'
import { planIncludes } from '@/lib/zambiaSchoolFeatures'
import { getSubscriptionState, TRIAL_DAYS, TRIAL_MONTHS } from '@/lib/billing/subscription'
import {
  INDIVIDUAL_STUDENT_LIMIT,
  PLAN_PRICING,
  normalizePlanSlug,
  INDIVIDUAL_PLANS,
} from '@/lib/billing/plan-pricing'
import {
  individualPlanRequiresPayment,
  individualPlanRequiresPaymentAtSignup,
} from '@/lib/onboarding/individual'

describe('Individual Portal utilities', () => {
  it('generates 6-char enrollment codes without ambiguous chars', () => {
    const code = generateEnrollmentCode()
    expect(code).toHaveLength(6)
    expect(code).not.toMatch(/[0O1I]/)
  })

  it('trial is 2 months (60 days)', () => {
    expect(TRIAL_MONTHS).toBe(2)
    expect(TRIAL_DAYS).toBe(60)
  })

  it('individual plans are teacher-only', () => {
    expect(INDIVIDUAL_PLANS.has('individual')).toBe(true)
    expect(INDIVIDUAL_PLANS.has('student_premium')).toBe(false)
    expect(INDIVIDUAL_PLANS.has('student_free')).toBe(false)
  })

  it('individual teacher plan is K50 and requires payment after trial', () => {
    expect(PLAN_PRICING.individual).toBe(50)
    expect(individualPlanRequiresPayment('individual')).toBe(true)
    expect(individualPlanRequiresPaymentAtSignup()).toBe(false)
    expect(normalizePlanSlug('individual_free')).toBe('individual')
  })

  it('individual plan excludes AI lesson planner', () => {
    expect(planIncludes('individual', 'ai-lesson-planner')).toBe(false)
    expect(planIncludes('individual', 'ecz-tracking')).toBe(true)
  })

  it('individual_premium includes AI lesson planner', () => {
    expect(planIncludes('individual_premium', 'ai-lesson-planner')).toBe(true)
  })

  it('individual paid plan respects planExpiresAt after trial', () => {
    const expired = getSubscriptionState({
      plan: 'individual',
      active: true,
      trialEndsAt: new Date(Date.now() - 86400000),
      planExpiresAt: new Date(Date.now() - 86400000),
    })
    expect(expired.active).toBe(false)

    const paid = getSubscriptionState({
      plan: 'individual',
      active: true,
      trialEndsAt: new Date(Date.now() - 86400000),
      planExpiresAt: new Date(Date.now() + 86400000),
    })
    expect(paid.active).toBe(true)
  })

  it('student cap limit is 5 on individual plan', () => {
    expect(INDIVIDUAL_STUDENT_LIMIT.individual).toBe(5)
    expect(INDIVIDUAL_STUDENT_LIMIT.individual_premium).toBe(Infinity)
  })
})

describe('requireSchoolType integration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports checkStudentCap helper', async () => {
    const gate = await import('@/lib/middleware/individual-gate')
    expect(typeof gate.checkStudentCap).toBe('function')
    expect(typeof gate.requireSchoolType).toBe('function')
  })
})
