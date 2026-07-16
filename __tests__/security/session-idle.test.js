/**
 * Idle session policy — 10 minute auto-logout across dashboards / platform admin.
 */
import { describe, it, expect } from 'vitest'
import { IDLE_TIMEOUT_MS, getIdleMs, isIdleTimedOut } from '@/lib/security/sessionIdle'

describe('sessionIdle', () => {
  it('uses a 10-minute idle timeout', () => {
    expect(IDLE_TIMEOUT_MS).toBe(10 * 60 * 1000)
  })

  it('does not treat missing activity as timed out', () => {
    expect(isIdleTimedOut(0)).toBe(false)
    expect(isIdleTimedOut(null)).toBe(false)
    expect(getIdleMs(0)).toBe(0)
  })

  it('times out when idle exceeds 10 minutes', () => {
    const now = 1_000_000
    const last = now - IDLE_TIMEOUT_MS
    expect(isIdleTimedOut(last, now)).toBe(true)
    expect(isIdleTimedOut(last + 1, now)).toBe(false)
  })

  it('reports idle duration from last activity', () => {
    const now = 500_000
    expect(getIdleMs(now - 60_000, now)).toBe(60_000)
  })
})
