/**
 * BOLA / privilege escalation: role-restricted dashboard pages must not return
 * 200 HTML to lower-privilege sessions (client-only guards are insufficient).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'
import proxy from '@/proxy.js'
import { buildRequest, parseJson } from '../helpers/request.js'
import {
  matchDashboardRoleGate,
  roleMatchesDashboardGroups,
} from '@/lib/security/dashboardRouteAuth'
import { signActivityTimestamp } from '@/lib/security/sessionActivity'

let freshActivity = ''

beforeAll(async () => {
  freshActivity = await signActivityTimestamp()
})

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

function documentRequest(pathname, cookies = {}) {
  const req = buildRequest({
    method: 'GET',
    url: `http://localhost:3000${pathname}`,
    headers: {
      accept: 'text/html,application/xhtml+xml',
    },
    cookies: {
      session_activity: freshActivity,
      ...cookies,
    },
  })
  req.nextUrl = new URL(req.url)
  return req
}

describe('dashboardRouteAuth', () => {
  it('matches headteacher portal prefix', () => {
    const gate = matchDashboardRoleGate('/dashboard/headteacher/timetable')
    expect(gate?.prefix).toBe('/dashboard/headteacher')
    expect(gate?.groups).toContain('ADMIN')
  })

  it('allows headteacher role for admin gate', () => {
    expect(roleMatchesDashboardGroups('headteacher', ['ADMIN'])).toBe(true)
  })

  it('rejects student role for admin gate', () => {
    expect(roleMatchesDashboardGroups('student', ['ADMIN'])).toBe(false)
  })
})

describe('dashboard BOLA prevention (proxy)', () => {
  it('student token receives 403 on GET /dashboard/headteacher', async () => {
    const req = documentRequest('/dashboard/headteacher', {
      access_token: signedAccessToken('student'),
    })

    const res = await proxy(req)
    expect(res.status).toBe(403)
    const body = await parseJson(res)
    expect(body.error).toMatch(/forbidden/i)
  })

  it('student token receives 403 on nested headteacher route', async () => {
    const req = documentRequest('/dashboard/headteacher/timetable', {
      access_token: signedAccessToken('student'),
    })

    const res = await proxy(req)
    expect(res.status).toBe(403)
  })

  it('headteacher token is allowed through GET /dashboard/headteacher', async () => {
    const req = documentRequest('/dashboard/headteacher', {
      access_token: signedAccessToken('headteacher'),
    })

    const res = await proxy(req)
    expect(res.status).not.toBe(403)
  })

  it('teacher token receives 403 on GET /dashboard/headteacher', async () => {
    const req = documentRequest('/dashboard/headteacher', {
      access_token: signedAccessToken('teacher'),
    })

    const res = await proxy(req)
    expect(res.status).toBe(403)
  })

  it('teacher token receives 403 on GET /dashboard/admin', async () => {
    const req = documentRequest('/dashboard/admin', {
      access_token: signedAccessToken('teacher'),
    })

    const res = await proxy(req)
    expect(res.status).toBe(403)
  })

  it('teacher token receives 403 on GET /dashboard/hod', async () => {
    const req = documentRequest('/dashboard/hod', {
      access_token: signedAccessToken('teacher'),
    })

    const res = await proxy(req)
    expect(res.status).toBe(403)
  })

  it('hod token is allowed through GET /dashboard/hod', async () => {
    const req = documentRequest('/dashboard/hod', {
      access_token: signedAccessToken('hod'),
    })

    const res = await proxy(req)
    expect(res.status).not.toBe(403)
  })

  it('student token receives 403 on GET /dashboard/teacher', async () => {
    const req = documentRequest('/dashboard/teacher', {
      access_token: signedAccessToken('student'),
    })

    const res = await proxy(req)
    expect(res.status).toBe(403)
  })

  it('teacher token is allowed through GET /dashboard/teacher', async () => {
    const req = documentRequest('/dashboard/teacher', {
      access_token: signedAccessToken('teacher'),
    })

    const res = await proxy(req)
    expect(res.status).not.toBe(403)
  })

  it('headteacher token receives 403 on GET /dashboard/student', async () => {
    const req = documentRequest('/dashboard/student', {
      access_token: signedAccessToken('headteacher'),
    })

    const res = await proxy(req)
    expect(res.status).toBe(403)
  })

  it('student token is allowed through GET /dashboard/student', async () => {
    const req = documentRequest('/dashboard/student', {
      access_token: signedAccessToken('student'),
    })

    const res = await proxy(req)
    expect(res.status).not.toBe(403)
  })

  it('shared dashboard routes stay reachable for any authenticated role', async () => {
    const req = documentRequest('/dashboard/settings', {
      access_token: signedAccessToken('student'),
    })

    const res = await proxy(req)
    expect(res.status).not.toBe(403)
  })
})
