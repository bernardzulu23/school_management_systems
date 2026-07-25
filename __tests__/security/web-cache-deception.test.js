import { describe, it, expect, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'
import proxy from '@/proxy.js'
import { buildRequest, parseJson } from '../helpers/request.js'
import { signActivityTimestamp } from '@/lib/security/sessionActivity'
import {
  getRawPathname,
  hasDangerousPath,
  shouldApplyWcdNoStore,
  shouldRejectStaticExtensionOnDynamicPath,
  WCD_NO_STORE,
} from '@/lib/security/webCacheDeception'
import { ensureSecureResponse } from '@/lib/middleware/secureApi'

let freshActivity = ''
beforeAll(async () => {
  freshActivity = await signActivityTimestamp()
})

function signedAccessToken(role = 'teacher') {
  return jwt.sign(
    {
      id: `user-${role}`,
      email: `${role}@test.local`,
      role,
      schoolId: 'school-1',
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  )
}

function proxyReq(url, { method = 'GET', cookies = {} } = {}) {
  const req = buildRequest({
    method,
    url,
    cookies: {
      access_token: signedAccessToken('headteacher'),
      session_activity: freshActivity,
      ...cookies,
    },
  })
  req.nextUrl = new URL(req.url)
  return req
}

describe('webCacheDeception helpers', () => {
  it('detects encoded slash / traversal / semicolon / encoded delimiters', () => {
    expect(hasDangerousPath('/static/..%2fdashboard/headteacher')).toBe(true)
    expect(hasDangerousPath('/dashboard/headteacher;wcd.js')).toBe(true)
    expect(hasDangerousPath('/dashboard/headteacher%23wcd.css')).toBe(true)
    expect(hasDangerousPath('/profile%2f%2e%2e%2frobots.txt')).toBe(true)
    expect(hasDangerousPath('/dashboard/headteacher')).toBe(false)
    expect(hasDangerousPath('/api/students/123')).toBe(false)
  })

  it('rejects static extension on dynamic paths but allows known assets', () => {
    expect(shouldRejectStaticExtensionOnDynamicPath('/api/students/123/steal.css')).toBe(true)
    expect(shouldRejectStaticExtensionOnDynamicPath('/dashboard/headteacher.js')).toBe(true)
    expect(shouldRejectStaticExtensionOnDynamicPath('/icons/app.png')).toBe(false)
    expect(shouldRejectStaticExtensionOnDynamicPath('/_next/static/chunk.js')).toBe(false)
    expect(shouldRejectStaticExtensionOnDynamicPath('/manifest.json')).toBe(false)
    expect(shouldRejectStaticExtensionOnDynamicPath('/robots.txt')).toBe(false)
  })

  it('applies no-store to dashboard/api/platform/onboarding except health/assets', () => {
    expect(shouldApplyWcdNoStore('/dashboard/teacher')).toBe(true)
    expect(shouldApplyWcdNoStore('/api/students')).toBe(true)
    expect(shouldApplyWcdNoStore('/platform/schools')).toBe(true)
    expect(shouldApplyWcdNoStore('/onboarding/plan')).toBe(true)
    expect(shouldApplyWcdNoStore('/api/health')).toBe(false)
    expect(shouldApplyWcdNoStore('/api/security-static/assets/x.png')).toBe(false)
    expect(shouldApplyWcdNoStore('/pricing')).toBe(false)
  })

  it('extracts raw pathname without relying on decoded URL.pathname alone', () => {
    expect(getRawPathname('http://localhost:3000/static/..%2fdashboard/headteacher')).toBe(
      '/static/..%2fdashboard/headteacher'
    )
  })
})

describe('WCD proxy defenses', () => {
  it('returns 400 for encoded path traversal (Test B)', async () => {
    const res = await proxy(proxyReq('http://localhost:3000/static/..%2fdashboard/headteacher'))
    expect(res.status).toBe(400)
    const body = await parseJson(res)
    expect(body.code).toBe('INVALID_PATH')
  })

  it('returns 400 for semicolon delimiter discrepancy (Test C)', async () => {
    const res = await proxy(proxyReq('http://localhost:3000/dashboard/headteacher;wcd.js'))
    expect(res.status).toBe(400)
    const body = await parseJson(res)
    expect(body.code).toBe('INVALID_PATH')
  })

  it('returns 404 for static extension on API path (Test A)', async () => {
    const res = await proxy(proxyReq('http://localhost:3000/api/students/123/steal.css'))
    expect(res.status).toBe(404)
  })

  it('sets no-store Cache-Control on dashboard responses (Test D)', async () => {
    const res = await proxy(proxyReq('http://localhost:3000/dashboard/headteacher'))
    expect(res.headers.get('Cache-Control')).toContain('no-store')
    expect(res.headers.get('Surrogate-Control')).toBe('no-store')
  })

  it('sets no-store on API paths including public auth/me', async () => {
    const res = await proxy(proxyReq('http://localhost:3000/api/auth/me'))
    expect(res.headers.get('Cache-Control') || '').toContain('no-store')
    expect(res.headers.get('Surrogate-Control')).toBe('no-store')
  })
})

describe('withSecureApi / ensureSecureResponse (Fix 3)', () => {
  it('forces no-store and strips ETag / Last-Modified', () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ETag: '"abc"',
        'Last-Modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      },
    })
    const req = buildRequest({ url: 'http://localhost:3000/api/teacher/results' })
    const secured = ensureSecureResponse(response, req)
    expect(secured.headers.get('Cache-Control')).toBe(WCD_NO_STORE)
    expect(secured.headers.get('Surrogate-Control')).toBe('no-store')
    expect(secured.headers.get('ETag')).toBeNull()
    expect(secured.headers.get('Last-Modified')).toBeNull()
  })
})
