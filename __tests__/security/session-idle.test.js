/**
 * Server + client idle session policy (web cookie sessions).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'
import proxy from '@/proxy.js'
import { buildRequest, parseJson } from '../helpers/request.js'
import {
  IDLE_TIMEOUT_MS as CLIENT_IDLE_MS,
  IDLE_WARNING_MS,
  isIdleTimedOut as clientIsIdleTimedOut,
  shouldShowIdleWarning,
} from '@/lib/security/sessionIdle'
import {
  IDLE_TIMEOUT_MS,
  IDLE_TIMEOUT_CODE,
  isIdleTimedOut,
  isPassiveActivityPath,
  shouldEnforceCookieIdle,
  signActivityTimestamp,
  verifyActivityCookieValue,
} from '@/lib/security/sessionActivity'

function signedAccessToken(role = 'teacher', overrides = {}) {
  return jwt.sign(
    {
      id: `user-${role}`,
      email: `${role}@test.local`,
      role,
      schoolId: 'school-1',
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  )
}

function signedPlatformToken() {
  return jwt.sign(
    {
      id: 'platform-admin-1',
      email: 'super@test.local',
      role: 'superadmin',
      isPlatform: true,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  )
}

async function freshActivityCookie(now = Date.now()) {
  return signActivityTimestamp(now)
}

async function staleActivityCookie(now = Date.now()) {
  return signActivityTimestamp(now - IDLE_TIMEOUT_MS - 1000)
}

function apiRequest(pathname, { cookies = {}, headers = {}, method = 'GET' } = {}) {
  const req = buildRequest({
    method,
    url: `http://localhost:3000${pathname}`,
    headers: {
      accept: 'application/json',
      ...headers,
    },
    cookies,
  })
  req.nextUrl = new URL(req.url)
  return req
}

describe('client sessionIdle UX policy', () => {
  it('uses a 10-minute idle timeout and warns at ~1 minute remaining', () => {
    expect(CLIENT_IDLE_MS).toBe(10 * 60 * 1000)
    expect(IDLE_WARNING_MS).toBe(9 * 60 * 1000)
  })

  it('shows warning only in the final minute window', () => {
    const now = 1_000_000
    expect(shouldShowIdleWarning(now - IDLE_WARNING_MS, now)).toBe(true)
    expect(shouldShowIdleWarning(now - CLIENT_IDLE_MS, now)).toBe(false)
    expect(shouldShowIdleWarning(now - 60_000, now)).toBe(false)
  })

  it('does not treat missing client activity as timed out', () => {
    expect(clientIsIdleTimedOut(0)).toBe(false)
  })
})

describe('server sessionActivity', () => {
  beforeAll(() => {
    expect(process.env.JWT_SECRET).toBeTruthy()
  })

  it('uses the same 10-minute idle timeout as the client', () => {
    expect(IDLE_TIMEOUT_MS).toBe(10 * 60 * 1000)
  })

  it('signs and verifies activity timestamps', async () => {
    const now = Date.now()
    const value = await signActivityTimestamp(now)
    const at = await verifyActivityCookieValue(value)
    expect(at).toBe(Math.floor(now))
  })

  it('rejects forged activity cookies', async () => {
    expect(await verifyActivityCookieValue(`${Date.now()}.deadbeef`)).toBeNull()
  })

  it('treats missing activity as idle on the server', () => {
    expect(isIdleTimedOut(null)).toBe(true)
    expect(isIdleTimedOut(0)).toBe(true)
  })

  it('marks me/refresh/notifications as passive (no stamp)', () => {
    expect(isPassiveActivityPath('/api/auth/me')).toBe(true)
    expect(isPassiveActivityPath('/api/auth/refresh')).toBe(true)
    expect(isPassiveActivityPath('/api/notifications/list')).toBe(true)
    expect(isPassiveActivityPath('/api/auth/touch')).toBe(false)
    expect(isPassiveActivityPath('/api/platform/stats/overview')).toBe(false)
    expect(isPassiveActivityPath('/dashboard/teacher')).toBe(false)
  })

  it('does not enforce idle on Bearer-only requests', () => {
    const req = apiRequest('/api/students', {
      headers: { authorization: 'Bearer sometoken' },
    })
    expect(shouldEnforceCookieIdle(req, '/api/students')).toBe(false)
  })
})

describe('proxy idle enforcement (cookie sessions)', () => {
  it('rejects stale cookie session on school API with IDLE_TIMEOUT', async () => {
    const stale = await staleActivityCookie()
    const req = apiRequest('/api/students', {
      cookies: {
        access_token: signedAccessToken('teacher'),
        session_activity: stale,
      },
    })
    const res = await proxy(req)
    expect(res.status).toBe(401)
    const body = await parseJson(res)
    expect(body.code).toBe(IDLE_TIMEOUT_CODE)
    expect(String(body.error || '')).toMatch(/inactivity/i)
  })

  it('allows fresh cookie session on school API', async () => {
    const fresh = await freshActivityCookie()
    const req = apiRequest('/api/students', {
      cookies: {
        access_token: signedAccessToken('teacher'),
        session_activity: fresh,
      },
    })
    const res = await proxy(req)
    expect(res.status).not.toBe(401)
  })

  it('rejects stale platform superadmin API the same way (not exempt)', async () => {
    const stale = await staleActivityCookie()
    const req = apiRequest('/api/platform/stats/overview', {
      cookies: {
        access_token: signedPlatformToken(),
        session_activity: stale,
      },
    })
    const res = await proxy(req)
    expect(res.status).toBe(401)
    const body = await parseJson(res)
    expect(body.code).toBe(IDLE_TIMEOUT_CODE)
  })

  it('allows fresh platform superadmin API', async () => {
    const fresh = await freshActivityCookie()
    const req = apiRequest('/api/platform/stats/overview', {
      cookies: {
        access_token: signedPlatformToken(),
        session_activity: fresh,
      },
    })
    const res = await proxy(req)
    expect(res.status).not.toBe(401)
  })

  it('does not idle-gate Bearer Authorization requests', async () => {
    const req = apiRequest('/api/students', {
      headers: { authorization: `Bearer ${signedAccessToken('teacher')}` },
    })
    const res = await proxy(req)
    expect(res.status).not.toBe(401)
  })

  it('redirects idle document GET on /platform to login?reason=idle', async () => {
    const stale = await staleActivityCookie()
    const req = buildRequest({
      method: 'GET',
      url: 'http://localhost:3000/platform/overview',
      headers: { accept: 'text/html' },
      cookies: {
        access_token: signedPlatformToken(),
        session_activity: stale,
      },
    })
    req.nextUrl = new URL(req.url)
    const res = await proxy(req)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const loc = res.headers.get('location') || ''
    expect(loc).toContain('/login')
    expect(loc).toContain('reason=idle')
  })

  it('does not stamp activity on passive /api/auth/me', async () => {
    const fresh = await freshActivityCookie(Date.now() - 60_000)
    const req = apiRequest('/api/auth/me', {
      cookies: {
        access_token: signedAccessToken('teacher'),
        session_activity: fresh,
      },
    })
    const res = await proxy(req)
    const setCookie = res.headers.getSetCookie?.() || []
    const stamped = setCookie.some((c) => c.startsWith('session_activity='))
    expect(stamped).toBe(false)
  })
})

/** Dashboard prefixes covered by shared proxy idle (not per-layout). */
describe('idle dashboard coverage inventory', () => {
  const prefixes = [
    '/dashboard/headteacher',
    '/dashboard/admin',
    '/dashboard/hod',
    '/dashboard/teacher',
    '/dashboard/student',
    '/dashboard/guidance',
    '/dashboard/sic',
    '/dashboard/proprietor',
    '/dashboard/solo',
    '/dashboard/attendance',
    '/platform/overview',
    '/platform/dashboard',
  ]

  it.each(prefixes)('enforces cookie idle on %s', async (pathname) => {
    const stale = await staleActivityCookie()
    const token = pathname.startsWith('/platform')
      ? signedPlatformToken()
      : signedAccessToken('headteacher')
    const req = buildRequest({
      method: 'GET',
      url: `http://localhost:3000${pathname}`,
      headers: { accept: 'text/html' },
      cookies: { access_token: token, session_activity: stale },
    })
    req.nextUrl = new URL(req.url)
    const res = await proxy(req)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(String(res.headers.get('location') || '')).toContain('reason=idle')
  })
})
