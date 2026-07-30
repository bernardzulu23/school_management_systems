import { describe, expect, it } from 'vitest'
import { hasHodPortalAccess } from '@/lib/hod/hodAccess'

describe('hasHodPortalAccess', () => {
  it('allows role hod', () => {
    expect(hasHodPortalAccess({ role: 'hod' })).toBe(true)
  })

  it('allows isHod claim without hodProfile', () => {
    expect(hasHodPortalAccess({ role: 'teacher', isHod: true })).toBe(true)
  })

  it('allows hodProfile without role upgrade', () => {
    expect(hasHodPortalAccess({ role: 'teacher', hodProfile: { id: '1' } })).toBe(true)
  })

  it('rejects plain teachers', () => {
    expect(hasHodPortalAccess({ role: 'teacher' })).toBe(false)
  })

  it('rejects missing user', () => {
    expect(hasHodPortalAccess(null)).toBe(false)
  })
})
