import { describe, it, expect } from 'vitest'
import {
  getSubscriptionState,
  legacyTrialEndsAtBackfill,
  resolveTrialEndsAt,
  computeExtendedPilotEndsAt,
  TRIAL_DAYS,
} from '@/lib/billing/subscription'

describe('legacy school subscription access', () => {
  it('derives trial end from createdAt when trialEndsAt is missing', () => {
    const createdAt = new Date('2026-05-01T00:00:00.000Z')
    const trialEnd = resolveTrialEndsAt({ plan: 'trial', createdAt })
    expect(trialEnd).toBeTruthy()
    const ms = trialEnd.getTime() - createdAt.getTime()
    expect(Math.round(ms / (24 * 60 * 60 * 1000))).toBe(TRIAL_DAYS)
  })

  it('treats legacy trial schools as active when createdAt trial is still valid', () => {
    const createdAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const state = getSubscriptionState({
      plan: 'trial',
      active: true,
      createdAt,
      trialEndsAt: null,
    })
    expect(state.active).toBe(true)
    expect(state.expired).toBe(false)
  })

  it('returns a backfill date for trial schools missing trialEndsAt', () => {
    const backfill = legacyTrialEndsAtBackfill({ plan: 'trial', trialEndsAt: null })
    expect(backfill).toBeInstanceOf(Date)
    expect(backfill.getTime()).toBeGreaterThan(Date.now())
  })

  it('does not backfill when trialEndsAt is already set', () => {
    const backfill = legacyTrialEndsAtBackfill({
      plan: 'trial',
      trialEndsAt: new Date('2027-01-01'),
    })
    expect(backfill).toBeNull()
  })
})

describe('computeExtendedPilotEndsAt', () => {
  it('extends from current future trial end by N months', () => {
    const now = new Date(2026, 6, 23, 12, 0, 0) // 23 Jul 2026 local
    const trialEndsAt = new Date(2026, 7, 1) // 1 Aug 2026
    const next = computeExtendedPilotEndsAt({ plan: 'trial', trialEndsAt }, 3, now)
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(10) // November (Aug + 3)
  })

  it('extends from now when trial already expired', () => {
    const now = new Date(2026, 6, 23, 12, 0, 0)
    const trialEndsAt = new Date(2026, 5, 1) // 1 Jun 2026 — expired
    const next = computeExtendedPilotEndsAt({ plan: 'trial', trialEndsAt }, 2, now)
    expect(next.getTime()).toBeGreaterThan(now.getTime())
    expect(next.getMonth()).toBe(8) // September (Jul + 2)
  })

  it('rejects months outside 1–12', () => {
    expect(() => computeExtendedPilotEndsAt({ plan: 'trial' }, 0)).toThrow(/1 to 12/)
    expect(() => computeExtendedPilotEndsAt({ plan: 'trial' }, 13)).toThrow(/1 to 12/)
  })
})
