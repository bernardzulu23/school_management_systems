import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateEnrollmentCode } from '@/lib/utils/enrollment-code'
import { planIncludes } from '@/lib/zambiaSchoolFeatures'
import { getSubscriptionState } from '@/lib/billing/subscription'
import { INDIVIDUAL_STUDENT_LIMIT } from '@/lib/billing/plan-pricing'

describe('Individual Portal utilities', () => {
  it('generates 6-char enrollment codes without ambiguous chars', () => {
    const code = generateEnrollmentCode()
    expect(code).toHaveLength(6)
    expect(code).not.toMatch(/[0O1I]/)
  })

  it('individual_free excludes AI lesson planner', () => {
    expect(planIncludes('individual_free', 'ai-lesson-planner')).toBe(false)
    expect(planIncludes('individual_free', 'ecz-practice')).toBe(true)
  })

  it('individual_premium includes AI lesson planner', () => {
    expect(planIncludes('individual_premium', 'ai-lesson-planner')).toBe(true)
  })

  it('student_free includes ecz-practice only among AI features', () => {
    expect(planIncludes('student_free', 'ecz-practice')).toBe(true)
    expect(planIncludes('student_free', 'ai-lesson-planner')).toBe(false)
  })

  it('individual_free subscription is always active', () => {
    const state = getSubscriptionState({ plan: 'individual_free', active: true })
    expect(state.active).toBe(true)
    expect(state.expired).toBe(false)
  })

  it('student cap limit is 5 on individual_free', () => {
    expect(INDIVIDUAL_STUDENT_LIMIT.individual_free).toBe(5)
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
