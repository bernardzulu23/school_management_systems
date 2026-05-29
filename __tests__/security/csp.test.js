/**
 * Security tests: Content-Security-Policy and security headers (Task 25).
 *
 * What we test:
 * 1. buildContentSecurityPolicy emits the core directives we rely on.
 * 2. The CSP locks down object-src/base-uri/frame-ancestors.
 * 3. getSecurityHeaders includes the standard hardening headers.
 * 4. A request through the proxy carries CSP + nosniff + frame protection.
 */
import { describe, it, expect } from 'vitest'
import { buildContentSecurityPolicy, getSecurityHeaders } from '@/lib/security/headers'
import proxy from '@/proxy.js'
import { buildRequest } from '../helpers/request.js'

describe('Content-Security-Policy', () => {
  const csp = buildContentSecurityPolicy()

  it('sets a restrictive default-src and locks dangerous sinks', () => {
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("form-action 'self'")
  })

  it('allows the asset hosts the app actually needs', () => {
    expect(csp).toContain('script-src')
    // Monaco editor (code playground) loads from jsDelivr.
    expect(csp).toContain('https://cdn.jsdelivr.net')
    // Piston code execution endpoint.
    expect(csp).toContain('https://emkc.org')
  })
})

describe('getSecurityHeaders', () => {
  const headers = getSecurityHeaders({ includeHsts: true })

  it('includes the standard hardening headers', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBeTruthy()
    expect(headers['Permissions-Policy']).toBeTruthy()
    expect(headers['Content-Security-Policy']).toBeTruthy()
    expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d+/)
  })
})

describe('proxy applies security headers to responses', () => {
  it('health endpoint response carries CSP + nosniff + frame protection', async () => {
    const req = buildRequest({ method: 'GET', url: 'http://localhost:3000/api/health' })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.headers.get('content-security-policy')).toBeTruthy()
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
  })
})
