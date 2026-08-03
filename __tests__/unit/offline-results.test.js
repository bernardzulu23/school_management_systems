import { describe, expect, it } from 'vitest'
import { resultsStore } from '@/lib/offline/results-store'

describe('resultsStore helpers', () => {
  it('detects network failures and timeouts', () => {
    expect(resultsStore.isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true)
    expect(
      resultsStore.isNetworkFailure(Object.assign(new Error('x'), { name: 'AbortError' }))
    ).toBe(true)
    expect(resultsStore.isNetworkFailure(new Error('Request timed out'))).toBe(true)
    expect(resultsStore.isNetworkFailure(new Error('Validation failed'))).toBe(false)
  })
})
