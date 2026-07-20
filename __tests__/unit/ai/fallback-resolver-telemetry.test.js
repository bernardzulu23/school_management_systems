import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureWarning = vi.fn()
const captureInfo = vi.fn()

vi.mock('@/lib/utils/logger', () => ({
  captureWarning: (...args) => captureWarning(...args),
  captureInfo: (...args) => captureInfo(...args),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  resolveStaticFallback,
  buildFallbackContextBlock,
  __resetFallbackResolverCache,
} from '@/lib/ai/fallback-resolver'

describe('fallback-resolver telemetry', () => {
  beforeEach(() => {
    __resetFallbackResolverCache()
    captureWarning.mockClear()
    captureInfo.mockClear()
  })

  it('known_gap uses captureInfo (non-alerting), not captureWarning', () => {
    const hit = resolveStaticFallback('Physics', 3, 'waves')
    expect(hit).toBeNull()
    expect(captureInfo).toHaveBeenCalledWith(
      'ai.fallback.known_gap',
      expect.objectContaining({
        kind: 'known-gap',
        subject: 'physics',
        form: 3,
        coverage: 'missing-form-dir',
      })
    )
    expect(captureWarning).not.toHaveBeenCalledWith('ai.fallback.known_gap', expect.anything())
    expect(captureWarning.mock.calls.some(([msg]) => msg === 'ai.fallback.known_gap')).toBe(false)
  })

  it('Form 4 known_gap does not page via captureWarning', () => {
    expect(resolveStaticFallback('Mathematics', 'Form 4', 'calculus')).toBeNull()
    expect(captureInfo).toHaveBeenCalledWith(
      'ai.fallback.known_gap',
      expect.objectContaining({ form: 4 })
    )
    expect(captureWarning).not.toHaveBeenCalled()
  })

  it('null fallback still yields empty context block (soft miss)', () => {
    expect(buildFallbackContextBlock(null)).toBe('')
    expect(buildFallbackContextBlock(undefined)).toBe('')
  })
})
