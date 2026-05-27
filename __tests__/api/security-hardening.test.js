import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import proxy from '@/proxy.js'
import { buildRequest, parseJson } from '../helpers/request.js'

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

describe('security hardening (proxy)', () => {
  it('returns 403 for non-admin on /api/admin/*', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/admin/notifications',
      cookies: { access_token: signedAccessToken('teacher') },
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.status).toBe(403)
    const body = await parseJson(res)
    expect(body.error).toMatch(/forbidden/i)
  })

  it('returns 403 for mutating API call without CSRF', async () => {
    const req = buildRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/users',
      body: { name: 'x' },
      cookies: { access_token: signedAccessToken('admin') },
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.status).toBe(403)
    const body = await parseJson(res)
    expect(body.error).toMatch(/csrf/i)
  })
})
