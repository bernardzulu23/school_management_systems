import { describe, expect, it } from 'vitest'
import { sanitizeRedirectUrl } from '@/lib/security/safeRedirect'

describe('sanitizeRedirectUrl', () => {
  it('allows root-relative paths', () => {
    expect(sanitizeRedirectUrl('/login')).toBe('/login')
    expect(sanitizeRedirectUrl('/dashboard?tab=1')).toBe('/dashboard?tab=1')
  })

  it('blocks protocol-relative and dangerous URLs', () => {
    expect(sanitizeRedirectUrl('//evil.com/phish')).toBe('/dashboard')
    expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/dashboard')
    expect(sanitizeRedirectUrl('https://evil.com/login')).toBe('/dashboard')
  })

  it('allows tenant subdomain on configured base domain', () => {
    expect(
      sanitizeRedirectUrl('https://school.bluepeacktechnologies.com/login', {
        baseDomain: 'bluepeacktechnologies.com',
      })
    ).toBe('https://school.bluepeacktechnologies.com/login')
  })

  it('uses custom fallback', () => {
    expect(sanitizeRedirectUrl(null, { fallback: '/login' })).toBe('/login')
  })
})
