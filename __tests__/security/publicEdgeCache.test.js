import { describe, it, expect } from 'vitest'
import { isPublicEdgeCachePath, PUBLIC_EDGE_CACHE_PATHS } from '@/lib/security/publicEdgeCache'

describe('publicEdgeCache', () => {
  it('lists marketing routes', () => {
    expect(PUBLIC_EDGE_CACHE_PATHS).toContain('/')
    expect(PUBLIC_EDGE_CACHE_PATHS).toContain('/pricing')
  })

  it('matches homepage only for root path', () => {
    expect(isPublicEdgeCachePath('/')).toBe(true)
    expect(isPublicEdgeCachePath('/dashboard')).toBe(false)
    expect(isPublicEdgeCachePath('/login')).toBe(false)
  })

  it('matches future marketing paths', () => {
    expect(isPublicEdgeCachePath('/pricing')).toBe(true)
    expect(isPublicEdgeCachePath('/features')).toBe(true)
    expect(isPublicEdgeCachePath('/about')).toBe(true)
  })
})
