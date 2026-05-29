/**
 * Security tests: Authentication / middleware bypass prevention.
 *
 * Covers CVE-2025-29927 (Next.js middleware bypass via x-middleware-subrequest)
 * and tenant-header spoofing. We are on Next 16 (already patched), but the proxy
 * strips these headers as defence-in-depth — these tests lock that behaviour in.
 *
 * What we test:
 * 1. stripInternalRequestHeaders removes every blocked header.
 * 2. stripInternalRequestHeaders preserves legitimate headers.
 * 3. A client-supplied x-school-subdomain (tenant spoof) is stripped.
 * 4. A request carrying x-middleware-subrequest to an admin route with a
 *    non-admin token is still rejected (403) — the bypass does not work.
 */
import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import proxy from '@/proxy.js'
import { stripInternalRequestHeaders, INTERNAL_HEADERS_TO_STRIP } from '@/lib/security/headers'
import { buildRequest, parseJson } from '../helpers/request.js'

function signedAccessToken(role = 'teacher') {
  return jwt.sign(
    { id: `user-${role}`, email: `${role}@test.local`, role, schoolId: 'school-1' },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  )
}

describe('stripInternalRequestHeaders', () => {
  it('removes every blocked internal header', () => {
    const headers = new Headers()
    for (const name of INTERNAL_HEADERS_TO_STRIP) headers.set(name, 'attacker-value')
    stripInternalRequestHeaders(headers)
    for (const name of INTERNAL_HEADERS_TO_STRIP) {
      expect(headers.has(name)).toBe(false)
    }
  })

  it('strips the CVE-2025-29927 bypass header specifically', () => {
    const headers = new Headers({ 'x-middleware-subrequest': 'middleware:middleware:middleware' })
    stripInternalRequestHeaders(headers)
    expect(headers.has('x-middleware-subrequest')).toBe(false)
  })

  it('strips a spoofed tenant subdomain header', () => {
    const headers = new Headers({ 'x-school-subdomain': 'victim-school' })
    stripInternalRequestHeaders(headers)
    expect(headers.has('x-school-subdomain')).toBe(false)
  })

  it('preserves legitimate headers', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      authorization: 'Bearer abc',
      cookie: 'access_token=xyz',
    })
    stripInternalRequestHeaders(headers)
    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('authorization')).toBe('Bearer abc')
    expect(headers.get('cookie')).toBe('access_token=xyz')
  })
})

describe('CVE-2025-29927 bypass does not grant access', () => {
  it('non-admin with x-middleware-subrequest is still 403 on /api/admin/*', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/admin/notifications',
      headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware' },
      cookies: { access_token: signedAccessToken('teacher') },
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.status).toBe(403)
    const body = await parseJson(res)
    expect(body.error).toMatch(/forbidden/i)
  })
})
