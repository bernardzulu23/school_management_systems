/**
 * Security tests: Content-Security-Policy and security headers (Task 25).
 */
import { describe, it, expect } from 'vitest'
import {
  buildContentSecurityPolicy,
  buildStaticAssetContentSecurityPolicy,
  generateNonce,
  getCorsHeaders,
  getSecurityHeaders,
  getStaticSecurityHeaders,
  isStaticAssetPath,
} from '@/lib/security/headers'
import proxy from '@/proxy.js'
import { buildRequest } from '../helpers/request.js'

function scriptSrcDirective(csp) {
  const match = String(csp).match(/script-src ([^;]+)/)
  return match ? match[1] : ''
}

function styleSrcDirective(csp) {
  const match = String(csp).match(/style-src ([^;]+)/)
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

  it('uses nonce instead of unsafe-inline in style-src when nonce is set', () => {
    const styleSrc = styleSrcDirective(csp)
    expect(styleSrc).toContain(`'nonce-${nonce}'`)
    expect(styleSrc).not.toContain("'unsafe-inline'")
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
    expect(csp).toContain('https://api.resend.com')
    expect(csp).toContain('https://api.lipila.app')
  })

  it('static asset CSP blocks scripts and styles', () => {
    const assetCsp = buildStaticAssetContentSecurityPolicy()
    expect(assetCsp).toContain("script-src 'none'")
    expect(assetCsp).toContain("style-src 'none'")
    expect(assetCsp).toContain("default-src 'none'")
  })

  it('detects static asset paths', () => {
    expect(isStaticAssetPath('/Assets/logo.jpg')).toBe(true)
    expect(isStaticAssetPath('/icons/icon-192x192.png')).toBe(true)
    expect(isStaticAssetPath('/offline.html')).toBe(true)
    expect(isStaticAssetPath('/login')).toBe(false)
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

  it('does not emit CORS on HTML login (proxy applies CORS only to /api)', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'https://ndakedaysecondaryschool.bluepeacktechnologies.com/login',
      headers: { origin: 'https://other-school.bluepeacktechnologies.com' },
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
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

  it('login page uses nonce CSP without unsafe-inline', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'https://ndakedaysecondaryschool.bluepeacktechnologies.com/login',
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.headers.get('cache-control')).toContain('no-store')
    const csp = res.headers.get('content-security-policy') || ''
    expect(csp).toContain("'nonce-")
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).toContain('script-src-elem')
    expect(csp).toContain('https://challenges.cloudflare.com')
    expect(scriptSrcDirective(csp)).not.toContain("'unsafe-inline'")
    expect(styleSrcDirective(csp)).not.toContain("'unsafe-inline'")
  })

  it('static logo path carries asset CSP without ACAO wildcard', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'https://ndakedaysecondaryschool.bluepeacktechnologies.com/Assets/logo.jpg',
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    const csp = res.headers.get('content-security-policy') || ''
    expect(csp).toContain("script-src 'none'")
    expect(csp).toContain("style-src 'none'")
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    const hsts = res.headers.get('strict-transport-security')
    if (hsts) expect(String(hsts)).toMatch(/max-age=\d+/)
  })

  it('offline page has no external script CSP and HSTS', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'https://ndakedaysecondaryschool.bluepeacktechnologies.com/offline.html',
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    const csp = res.headers.get('content-security-policy') || ''
    expect(csp).toContain("script-src 'none'")
    const hsts = res.headers.get('strict-transport-security')
    if (hsts) expect(String(hsts)).toMatch(/max-age=\d+/)
  })
})
