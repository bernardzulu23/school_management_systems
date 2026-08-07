import { describe, expect, it } from 'vitest'
import { clearIpIntelligenceCache, enrichIp } from '@/lib/security/ipIntelligence'

describe('enrichIp', () => {
  it('returns empty defaults for private/unknown IPs without calling providers', async () => {
    clearIpIntelligenceCache()
    const result = await enrichIp('127.0.0.1')
    expect(result.country).toBeNull()
    expect(result.isVpn).toBe(false)
    expect(result.threatScore).toBeNull()

    const unknown = await enrichIp('unknown')
    expect(unknown.country).toBeNull()
  })
})
