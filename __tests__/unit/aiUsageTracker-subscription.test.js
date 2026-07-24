import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUnique = vi.fn()
const findMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    school: { findUnique: (...args) => findUnique(...args) },
    aIUsageLog: { findMany: (...args) => findMany(...args) },
  },
}))

vi.mock('@/lib/middleware/aiBurstLimit', () => ({
  checkAIBurstLimit: () => null,
}))

describe('checkAILimit subscription alignment', () => {
  beforeEach(() => {
    findUnique.mockReset()
    findMany.mockReset()
    findMany.mockResolvedValue([])
    vi.resetModules()
  })

  it('does not treat paid planExpiresAt as expired when trialEndsAt is still valid', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    findUnique.mockResolvedValue({
      id: 'school-1',
      plan: 'premium',
      planExpiresAt: past,
      trialEndsAt: future,
      createdAt: new Date('2026-01-01'),
      active: true,
    })

    const { checkAILimit } = await import('@/lib/middleware/aiUsageTracker')
    const block = await checkAILimit('school-1', 'user-1')
    expect(block).toBeNull()
  })

  it('blocks when both trial and paid periods are expired', async () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    findUnique.mockResolvedValue({
      id: 'school-1',
      plan: 'premium',
      planExpiresAt: past,
      trialEndsAt: past,
      createdAt: new Date('2025-01-01'),
      active: true,
    })

    const { checkAILimit } = await import('@/lib/middleware/aiUsageTracker')
    const block = await checkAILimit('school-1', 'user-1')
    expect(block).toBeTruthy()
    expect(block.status).toBe(402)
    const json = await block.json()
    expect(json.code).toBe('PLAN_EXPIRED')
  })

  it('allows active trial plan and uses premium AI limits', async () => {
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    findUnique.mockResolvedValue({
      id: 'school-1',
      plan: 'trial',
      planExpiresAt: null,
      trialEndsAt: future,
      createdAt: new Date('2026-01-01'),
      active: true,
    })

    const { checkAILimit, getSchoolPlanForUsage, getEffectivePlanForAiLimits } =
      await import('@/lib/middleware/aiUsageTracker')
    const school = await getSchoolPlanForUsage('school-1')
    expect(getEffectivePlanForAiLimits(school)).toBe('premium')
    expect(await checkAILimit('school-1')).toBeNull()
  })
})
