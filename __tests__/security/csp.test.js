/**
 * Security tests: Content-Security-Policy and security headers (Task 25).
 */
import { describe, it, expect } from 'vitest'
import {
  buildContentSecurityPolicy,
  generateNonce,
  getCorsHeaders,
  getSecurityHeaders,
  getStaticSecurityHeaders,
} from '@/lib/security/headers'
import proxy from '@/proxy.js'
import { buildRequest } from '../helpers/request.js'

function scriptSrcDirective(csp) {
  const match = String(csp).match(/script-src ([^;]+)/)
  return match ? match[1] : ''
}

describe('Content-Security-Policy', () => {
  const nonce = 'test-nonce-value'
  const csp = buildContentSecurityPolicy({ nonce })

  it('sets a restrictive default-src and locks dangerous sinks', () => {
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("form-action 'self'")
  })

  it('uses nonce + strict-dynamic instead of unsafe-inline in script-src', () => {
    expect(csp).toContain(`'nonce-${nonce}'`)
    expect(csp).toContain("'strict-dynamic'")
    const scriptSrc = scriptSrcDirective(csp)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('allows wasm-unsafe-eval in production script-src (dev uses unsafe-eval for HMR)', () => {
    const prodCsp = buildContentSecurityPolicy({ nonce: 'abc', production: true })
    const scriptSrc = scriptSrcDirective(prodCsp)
    expect(scriptSrc).toContain("'wasm-unsafe-eval'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('allows scoped unsafe-eval only when explicitly requested (Monaco playground)', () => {
    const monacoCsp = buildContentSecurityPolicy({ nonce: 'abc', allowEval: true })
    expect(monacoCsp).toContain("'unsafe-eval'")
  })

  it('allows connect hosts the app needs', () => {
    expect(csp).toContain('https://emkc.org')
    expect(csp).toContain('https://cdn.jsdelivr.net')
    expect(csp).toContain('https://challenges.cloudflare.com')
  })

  it('allows Cloudflare and jsDelivr in script-src and script-src-elem', () => {
    const docCsp = buildContentSecurityPolicy({ production: true })
    expect(docCsp).toContain('script-src-elem')
    expect(docCsp).toContain('https://static.cloudflareinsights.com')
    expect(docCsp).toContain('https://challenges.cloudflare.com')
    expect(scriptSrcDirective(docCsp)).toContain('https://cdn.jsdelivr.net')
  })

  it('document CSP allows Cloudflare inline bootstraps without strict-dynamic', () => {
    const docCsp = buildContentSecurityPolicy({ production: true })
    expect(docCsp).not.toContain("'strict-dynamic'")
    expect(scriptSrcDirective(docCsp)).toContain("'unsafe-inline'")
    expect(scriptSrcDirective(docCsp)).toContain("'self'")
  })
})

describe('getSecurityHeaders', () => {
  const nonce = generateNonce()
  const headers = getSecurityHeaders({ nonce, includeHsts: true })

  it('includes the standard hardening headers', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBeTruthy()
    expect(headers['Permissions-Policy']).toBeTruthy()
    expect(headers['Content-Security-Policy']).toContain(`'nonce-${nonce}'`)
    expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d+/)
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
  })

  it('omits CSP from static next.config headers (nonce is per-request in proxy)', () => {
    const staticHeaders = getStaticSecurityHeaders({ includeHsts: true })
    expect(staticHeaders['Content-Security-Policy']).toBeUndefined()
    expect(staticHeaders['X-Frame-Options']).toBe('DENY')
  })
})

describe('CORS', () => {
  it('does not emit wildcard Access-Control-Allow-Origin', () => {
    const req = buildRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/health',
      headers: { origin: 'https://evil.example.com' },
    })
    req.nextUrl = new URL(req.url)
    const cors = getCorsHeaders(req)
    expect(cors['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('allows same-origin and configured app origins', () => {
    const req = buildRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/health',
      headers: { origin: 'http://localhost:3000' },
    })
    req.nextUrl = new URL(req.url)
    const cors = getCorsHeaders(req)
    expect(cors['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
    expect(cors.Vary).toBe('Origin')
  })
})

describe('proxy applies security headers to responses', () => {
  it('health endpoint response carries nonce CSP + nosniff + frame protection', async () => {
    const req = buildRequest({ method: 'GET', url: 'http://localhost:3000/api/health' })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    const csp = res.headers.get('content-security-policy') || ''
    expect(csp).toBeTruthy()
    expect(csp).toContain("'nonce-")
    expect(csp).toContain("'strict-dynamic'")
    expect(scriptSrcDirective(csp)).not.toContain("'unsafe-inline'")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
  })

  it('marketing homepage uses edge cache headers and self-only script CSP', async () => {
    const req = buildRequest({ method: 'GET', url: 'https://www.bluepeacktechnologies.com/' })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600')
    const csp = res.headers.get('content-security-policy') || ''
    expect(csp).not.toContain("'nonce-")
    expect(csp).not.toContain("'strict-dynamic'")
    expect(scriptSrcDirective(csp)).toContain("'self'")
  })

  it('login page uses self-only script CSP (Next.js prerender has no script nonces)', async () => {
    const req = buildRequest({ method: 'GET', url: 'https://www.bluepeacktechnologies.com/login' })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.headers.get('cache-control')).toContain('no-store')
    const csp = res.headers.get('content-security-policy') || ''
    expect(csp).not.toContain("'nonce-")
    expect(csp).not.toContain("'strict-dynamic'")
    expect(csp).toContain('script-src-elem')
    expect(csp).toContain('https://challenges.cloudflare.com')
    expect(scriptSrcDirective(csp)).toContain("'self'")
    expect(scriptSrcDirective(csp)).toContain('https://cdn.jsdelivr.net')
  })
})
