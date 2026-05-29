/**
 * Security tests: JWT hardening (Task 28).
 *
 * Verifies the access-token verifier in lib/middleware/auth.ts:
 *   1. HS256 is pinned — `alg: none` and other algorithms are rejected
 *      (defeats the JWT algorithm-confusion attack).
 *   2. The `aud: zsms-api` claim is enforced — a wrong audience is rejected,
 *      while legacy tokens without an audience still verify (transition-safe).
 *   3. JWT_SECRET_PREVIOUS enables zero-downtime secret rotation — a token
 *      signed with the previous secret still verifies.
 */
import { describe, it, expect, afterEach } from 'vitest'
import * as jose from 'jose'
import { authMiddleware, JWT_AUDIENCE } from '@/lib/middleware/auth'
import { buildRequest } from '../helpers/request.js'

const SCHOOL = 'school-a-id'

function keyFrom(secret) {
  return new TextEncoder().encode(secret)
}

async function signWith({
  secret = process.env.JWT_SECRET,
  alg = 'HS256',
  aud = JWT_AUDIENCE,
} = {}) {
  const builder = new jose.SignJWT({
    id: 'user-a',
    email: 'a@test.local',
    role: 'teacher',
    schoolId: SCHOOL,
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('30m')
  if (aud) builder.setAudience(aud)
  return builder.sign(keyFrom(secret))
}

function authRequest(token) {
  return buildRequest({ url: 'http://localhost:3000/api/test', cookies: { access_token: token } })
}

afterEach(() => {
  delete process.env.JWT_SECRET_PREVIOUS
})

describe('algorithm pinning', () => {
  it('accepts a valid HS256 token with the correct audience', async () => {
    const token = await signWith()
    const result = await authMiddleware(authRequest(token))
    expect(result.isAuthenticated).toBe(true)
    expect(result.user.schoolId).toBe(SCHOOL)
  })

  it('rejects an alg:none token', async () => {
    // Hand-craft an unsigned token: header.payload. (no signature)
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({ id: 'user-a', role: 'teacher', schoolId: SCHOOL, aud: JWT_AUDIENCE })
    ).toString('base64url')
    const token = `${header}.${payload}.`

    const result = await authMiddleware(authRequest(token))
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.status).toBe(401)
  })

  it('rejects a token signed with a different algorithm (HS512)', async () => {
    const token = await signWith({ alg: 'HS512' })
    const result = await authMiddleware(authRequest(token))
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.status).toBe(401)
  })
})

describe('audience enforcement (transition-safe)', () => {
  it('rejects a token with a wrong audience', async () => {
    const token = await signWith({ aud: 'some-other-service' })
    const result = await authMiddleware(authRequest(token))
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.status).toBe(401)
  })

  it('accepts a legacy token with no audience claim', async () => {
    const token = await signWith({ aud: null })
    const result = await authMiddleware(authRequest(token))
    expect(result.isAuthenticated).toBe(true)
  })
})

describe('JWT_SECRET_PREVIOUS rotation', () => {
  it('accepts a token signed with the previous secret during a rotation window', async () => {
    const oldSecret = 'previous-rotation-secret-minimum-32-characters'
    process.env.JWT_SECRET_PREVIOUS = oldSecret
    const token = await signWith({ secret: oldSecret })

    const result = await authMiddleware(authRequest(token))
    expect(result.isAuthenticated).toBe(true)
    expect(result.user.schoolId).toBe(SCHOOL)
  })

  it('rejects a token signed with an unknown secret', async () => {
    const token = await signWith({ secret: 'an-unrelated-secret-minimum-32-characters-x' })
    const result = await authMiddleware(authRequest(token))
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.status).toBe(401)
  })
})
