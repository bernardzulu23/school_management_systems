import { describe, it, expect } from 'vitest'
import { planIncludes, minPlanForFeature, PLAN_FEATURES } from '@/lib/zambiaSchoolFeatures'
import {
  getAiQuota,
  getEffectivePlanForAiLimits,
  getPerMinuteLimit,
} from '@/lib/middleware/aiUsageTracker'

describe('planIncludes Pricing matrix', () => {
  it('basic allows SMS and core, denies AI and premium analytics', () => {
    expect(planIncludes('basic', 'sms-alerts')).toBe(true)
    expect(planIncludes('basic', 'bulk-announcements')).toBe(true)
    expect(planIncludes('basic', 'attendance')).toBe(true)
    expect(planIncludes('basic', 'ai-tools')).toBe(false)
    expect(planIncludes('basic', 'ai-lesson-planner')).toBe(false)
    expect(planIncludes('basic', 'ai-report-comments')).toBe(false)
    expect(planIncludes('basic', 'comprehensive-analytics')).toBe(false)
  })

  it('standard inherits SMS and AI makers, denies report-comments', () => {
    expect(planIncludes('standard', 'sms-alerts')).toBe(true)
    expect(planIncludes('standard', 'ai-tools')).toBe(true)
    expect(planIncludes('standard', 'ai-quiz-maker')).toBe(true)
    expect(planIncludes('standard', 'ai-report-comments')).toBe(false)
    expect(planIncludes('standard', 'predictive-analytics')).toBe(false)
    expect(planIncludes('standard', 'ai-requests-unlimited')).toBe(false)
  })

  it('premium allows report-comments and analytics', () => {
    expect(planIncludes('premium', 'ai-report-comments')).toBe(true)
    expect(planIncludes('premium', 'comprehensive-analytics')).toBe(true)
    expect(planIncludes('premium', 'ai-requests-unlimited')).toBe(true)
  })

  it('trial unlocks all features for testing', () => {
    expect(planIncludes('trial', 'ai-report-comments')).toBe(true)
    expect(planIncludes('trial', 'ai-tools')).toBe(true)
    expect(planIncludes('trial', 'sms-alerts')).toBe(true)
  })

  it('active trialEndsAt unlocks features even on basic plan string', () => {
    const school = { trialEndsAt: new Date(Date.now() + 86400000).toISOString() }
    expect(planIncludes('basic', 'ai-tools', school)).toBe(true)
  })

  it('minPlanForFeature points at real upgrade target', () => {
    expect(minPlanForFeature('sms-alerts')).toBe('basic')
    expect(minPlanForFeature('ai-lesson-planner')).toBe('standard')
    expect(minPlanForFeature('ai-report-comments')).toBe('premium')
  })

  it('basic list has no ai-* ids', () => {
    const aiIds = PLAN_FEATURES.basic.filter((id) => id.startsWith('ai-'))
    expect(aiIds).toEqual([])
  })
})

describe('AI quotas Pricing-aligned', () => {
  it('maps trial to trial (not premium)', () => {
    expect(
      getEffectivePlanForAiLimits({
        plan: 'trial',
        active: true,
        trialEndsAt: new Date(Date.now() + 86400000),
      })
    ).toBe('trial')
  })

  it('trial = 10/day, basic = 0, standard = 50/month, premium = unlimited', () => {
    expect(getAiQuota('trial')).toMatchObject({ limit: 10, period: 'day' })
    expect(getAiQuota('basic')).toMatchObject({ limit: 0 })
    expect(getAiQuota('standard')).toMatchObject({ limit: 50, period: 'month' })
    expect(Number.isFinite(getAiQuota('premium').limit)).toBe(false)
  })

  it('basic has zero per-minute AI burst', () => {
    expect(getPerMinuteLimit('basic')).toBe(0)
  })
})
