import { describe, it, expect } from 'vitest'
import {
  getSubscriptionState,
  legacyTrialEndsAtBackfill,
  resolveTrialEndsAt,
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
