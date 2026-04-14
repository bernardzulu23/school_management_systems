import {
  PRIMARY_ONLY_FEATURES,
  PLAN_FEATURES,
  canUseFeature,
  getAvailableFeaturesForSchool,
  planIncludes,
} from '@/lib/zambiaSchoolFeatures'
import { getMonthlyAIQuota, getPerMinuteLimit, normalizePlan } from '@/lib/ai/aiAccess'

describe('Zambia feature gating', () => {
  test('premium plan includes all features', () => {
    expect(planIncludes('premium', 'anything')).toBe(true)
  })

  test('basic plan excludes standard feature', () => {
    expect(planIncludes('basic', 'ai-story-weaver')).toBe(false)
  })

  test('standard plan includes basic and standard features', () => {
    expect(planIncludes('standard', PLAN_FEATURES.basic[0])).toBe(true)
    expect(planIncludes('standard', 'ai-story-weaver')).toBe(true)
  })

  test('secondary schools cannot use primary-only features', () => {
    const primaryOnlyId = Object.keys(PRIMARY_ONLY_FEATURES)[0]
    expect(canUseFeature('secondary', primaryOnlyId)).toBe(false)
    expect(canUseFeature('primary', primaryOnlyId)).toBe(true)
    expect(canUseFeature('combined', primaryOnlyId)).toBe(true)
  })

  test('available features exclude primary-only when school is secondary', () => {
    const features = getAvailableFeaturesForSchool('premium', 'secondary')
    const anyPrimaryOnlyIncluded = features.some((f) => PRIMARY_ONLY_FEATURES[f])
    expect(anyPrimaryOnlyIncluded).toBe(false)
  })
})

describe('AI access policy', () => {
  test('normalizePlan falls back to trial', () => {
    expect(normalizePlan('')).toBe('trial')
    expect(normalizePlan('unknown')).toBe('trial')
  })

  test('monthly quota by plan', () => {
    expect(getMonthlyAIQuota('trial')).toBe(10)
    expect(getMonthlyAIQuota('basic')).toBe(0)
    expect(getMonthlyAIQuota('standard')).toBe(50)
    expect(getMonthlyAIQuota('premium')).toBe(Number.POSITIVE_INFINITY)
  })

  test('per-minute limit by plan', () => {
    expect(getPerMinuteLimit('trial')).toBe(5)
    expect(getPerMinuteLimit('basic')).toBe(1)
    expect(getPerMinuteLimit('standard')).toBe(10)
    expect(getPerMinuteLimit('premium')).toBe(60)
  })
})
