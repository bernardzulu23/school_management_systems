import { describe, expect, it } from 'vitest'
import { CACHE_KEYS, SEED_FORMAT, SYNC_CONTRACT_VERSION } from '@/lib/offline/sync-contracts'

describe('sync-contracts', () => {
  it('keeps contract version and seed format stable', () => {
    expect(SYNC_CONTRACT_VERSION).toBe(1)
    expect(SEED_FORMAT).toBe('zsmsseed')
  })

  it('builds parent child cache keys', () => {
    expect(CACHE_KEYS.parentChildren).toBe('parent:children')
    expect(CACHE_KEYS.parentChild('abc')).toBe('parent:child:abc')
  })
})
