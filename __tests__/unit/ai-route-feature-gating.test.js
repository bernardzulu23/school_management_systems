import { describe, expect, it } from 'vitest'
import { PLAN_FEATURES, planIncludes } from '@/lib/zambiaSchoolFeatures'

describe('AI route feature gating', () => {
  it('removes the generic ai-tools key from the basic plan', () => {
    expect(PLAN_FEATURES.basic).not.toContain('ai-tools')
    expect(planIncludes('basic', 'ai-tools')).toBe(false)
  })

  it('blocks basic from study-assistant and term-reports while allowing standard and premium', () => {
    for (const featureId of ['ai-study-assistant', 'ai-term-reports']) {
      expect(PLAN_FEATURES.basic).not.toContain(featureId)
      expect(PLAN_FEATURES.standard).toContain(featureId)
      expect(PLAN_FEATURES.premium).toContain(featureId)

      expect(planIncludes('basic', featureId)).toBe(false)
      expect(planIncludes('standard', featureId)).toBe(true)
      expect(planIncludes('premium', featureId)).toBe(true)
    }
  })

  it('gates term-report GET list and export on ai-term-reports (basic blocked; standard/premium allowed)', () => {
    // List (GET /api/ai/term-reports) and export (GET .../export) use the same
    // featureId as POST/PATCH via authorizeAiRoute({ featureId: 'ai-term-reports' }).
    const featureId = 'ai-term-reports'
    expect(planIncludes('basic', featureId)).toBe(false)
    expect(planIncludes('standard', featureId)).toBe(true)
    expect(planIncludes('premium', featureId)).toBe(true)
  })
})
