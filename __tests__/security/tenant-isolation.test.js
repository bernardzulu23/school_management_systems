/**
 * CRITICAL security tests: multi-tenant data isolation.
 *
 * If any of these fail, there is a cross-tenant data-breach vulnerability.
 * They must pass before every production deployment.
 *
 * Coverage of the three OWASP multi-tenant attack vectors:
 *   1. Cross-tenant data leakage — School A's session cannot read School B.
 *   2. Tenant impersonation      — a forged schoolId (body/query/header) is ignored;
 *                                  the JWT/DB schoolId is the only source of truth.
 *   3. Privilege escalation      — platform bypass is tightly scoped.
 *
 * We test the two real enforcement layers plus the defence-in-depth helper:
 *   - verifyTenant / assertSameTenant  (lib/middleware/verify-tenant.js)
 *   - authMiddleware x-school-id spoof rejection (lib/middleware/auth.ts)
 *   - resolveAuthenticatedSchoolId mismatch rejection (lib/tenant/resolveSchoolId.js)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as jose from 'jose'
import {
  verifyTenant,
  getVerifiedSchoolId,
  assertSameTenant,
  isPlatformSession,
} from '@/lib/middleware/verify-tenant'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { mockPrisma } from '../setup.js'
import { buildRequest } from '../helpers/request.js'

const SCHOOL_A = 'school-a-id'
const SCHOOL_B = 'school-b-id'

async function signToken(payload) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(secret)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('verifyTenant — request schoolId is never trusted over the JWT', () => {
  it('denies a School A user targeting School B', () => {
    const user = { schoolId: SCHOOL_A, role: 'teacher' }
    const { schoolId, error } = verifyTenant(user, SCHOOL_B)
    expect(schoolId).toBeNull()
    expect(error).toMatch(/different school/i)
  })

  it('allows a School A user targeting their own school', () => {
    const { schoolId, error } = verifyTenant({ schoolId: SCHOOL_A, role: 'teacher' }, SCHOOL_A)
    expect(error).toBeNull()
    expect(schoolId).toBe(SCHOOL_A)
  })

  it('falls back to the JWT school when no target is supplied', () => {
    const { schoolId, error } = verifyTenant({ schoolId: SCHOOL_A, role: 'headteacher' }, undefined)
    expect(error).toBeNull()
    expect(schoolId).toBe(SCHOOL_A)
  })

  it('ignores a forged schoolId from a request body (impersonation)', () => {
    // Simulate a handler that mistakenly forwards body.schoolId.
    const user = { schoolId: SCHOOL_A, role: 'teacher' }
    const forgedFromBody = SCHOOL_B
    const { schoolId, error } = verifyTenant(user, forgedFromBody)
    expect(schoolId).toBeNull()
    expect(error).toBeTruthy()
  })

  it('rejects a non-platform user with no school binding', () => {
    const { schoolId, error } = verifyTenant({ schoolId: null, role: 'teacher' }, SCHOOL_A)
    expect(schoolId).toBeNull()
    expect(error).toMatch(/no school/i)
  })
})

describe('verifyTenant — controlled platform bypass', () => {
  it('lets a platform superadmin target any school', () => {
    const platform = { schoolId: null, role: 'superadmin', isPlatform: true }
    const { schoolId, error } = verifyTenant(platform, SCHOOL_B)
    expect(error).toBeNull()
    expect(schoolId).toBe(SCHOOL_B)
  })

  it('does NOT grant bypass for isPlatform without superadmin role', () => {
    expect(isPlatformSession({ isPlatform: true, role: 'teacher' })).toBe(false)
    const { error } = verifyTenant(
      { isPlatform: true, role: 'teacher', schoolId: SCHOOL_A },
      SCHOOL_B
    )
    expect(error).toBeTruthy()
  })

  it('does NOT grant bypass for superadmin role without isPlatform flag (forged claim)', () => {
    expect(isPlatformSession({ isPlatform: false, role: 'superadmin' })).toBe(false)
    const { error } = verifyTenant({ role: 'superadmin', schoolId: SCHOOL_A }, SCHOOL_B)
    expect(error).toBeTruthy()
  })
})

describe('getVerifiedSchoolId — route [schoolId] params', () => {
  it('denies access to another school via the URL param', () => {
    const { error } = getVerifiedSchoolId(
      { schoolId: SCHOOL_A, role: 'hod' },
      { schoolId: SCHOOL_B }
    )
    expect(error).toBeTruthy()
  })

  it('allows access to the user own school via the URL param', () => {
    const { schoolId, error } = getVerifiedSchoolId(
      { schoolId: SCHOOL_A, role: 'hod' },
      { schoolId: SCHOOL_A }
    )
    expect(error).toBeNull()
    expect(schoolId).toBe(SCHOOL_A)
  })
})

describe('assertSameTenant — object-level (IDOR) protection', () => {
  it('blocks reading a record owned by another school', () => {
    expect(assertSameTenant({ schoolId: SCHOOL_A, role: 'teacher' }, SCHOOL_B)).toBe(false)
  })

  it('allows reading a record owned by the same school', () => {
    expect(assertSameTenant({ schoolId: SCHOOL_A, role: 'teacher' }, SCHOOL_A)).toBe(true)
  })

  it('blocks when the record has no school binding', () => {
    expect(assertSameTenant({ schoolId: SCHOOL_A, role: 'teacher' }, null)).toBe(false)
  })

  it('allows a platform superadmin to read any record', () => {
    expect(assertSameTenant({ role: 'superadmin', isPlatform: true }, SCHOOL_B)).toBe(true)
  })
})

describe('authMiddleware — x-school-id header spoof is rejected', () => {
  it('returns 403 when the spoofed header school differs from the JWT school', async () => {
    const token = await signToken({
      id: 'user-a',
      email: 'a@test.local',
      role: 'teacher',
      schoolId: SCHOOL_A,
    })
    const req = buildRequest({
      url: 'http://localhost:3000/api/test',
      headers: { 'x-school-id': SCHOOL_B },
      cookies: { access_token: token },
    })

    const result = await authMiddleware(req)
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.status).toBe(403)
  })

  it('authenticates when the header matches the JWT school', async () => {
    const token = await signToken({
      id: 'user-a',
      email: 'a@test.local',
      role: 'teacher',
      schoolId: SCHOOL_A,
    })
    const req = buildRequest({
      url: 'http://localhost:3000/api/test',
      headers: { 'x-school-id': SCHOOL_A },
      cookies: { access_token: token },
    })

    const result = await authMiddleware(req)
    expect(result.isAuthenticated).toBe(true)
    expect(result.user.schoolId).toBe(SCHOOL_A)
  })
})

describe('resolveAuthenticatedSchoolId — DB is the source of truth', () => {
  it('rejects when the JWT school does not match the DB record (stale/forged token)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      schoolId: SCHOOL_A,
      school: { id: SCHOOL_A, active: true, subdomain: 'school-a' },
    })

    const req = buildRequest({ url: 'http://localhost:3000/api/test' })
    // Token claims School B, but the DB says this user belongs to School A.
    const result = await resolveAuthenticatedSchoolId(req, { id: 'user-a', schoolId: SCHOOL_B })

    expect(result.ok).toBe(false)
    expect(result.response.status).toBe(403)
    const body = await result.response.json()
    expect(body.code).toBe('TENANT_TOKEN_MISMATCH')
  })

  it('rejects a spoofed x-school-id header that differs from the DB school', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      schoolId: SCHOOL_A,
      school: { id: SCHOOL_A, active: true, subdomain: 'school-a' },
    })

    const req = buildRequest({
      url: 'http://localhost:3000/api/test',
      headers: { 'x-school-id': SCHOOL_B },
    })
    const result = await resolveAuthenticatedSchoolId(req, { id: 'user-a', schoolId: SCHOOL_A })

    expect(result.ok).toBe(false)
    expect(result.response.status).toBe(403)
    const body = await result.response.json()
    expect(body.code).toBe('TENANT_HEADER_MISMATCH')
  })

  it('rejects when the school is inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      schoolId: SCHOOL_A,
      school: { id: SCHOOL_A, active: false, subdomain: 'school-a' },
    })

    const req = buildRequest({ url: 'http://localhost:3000/api/test' })
    const result = await resolveAuthenticatedSchoolId(req, { id: 'user-a', schoolId: SCHOOL_A })

    expect(result.ok).toBe(false)
    expect(result.response.status).toBe(403)
    const body = await result.response.json()
    expect(body.code).toBe('TENANT_NOT_FOUND')
  })

  it('returns 503 when tenant lookup hits a missing User/School table', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(
      Object.assign(new Error('The table `public.User` does not exist in the current database.'), {
        code: 'P2021',
      })
    )

    const req = buildRequest({ url: 'http://localhost:3000/api/test' })
    const result = await resolveAuthenticatedSchoolId(req, { id: 'user-a', schoolId: SCHOOL_A })

    expect(result.ok).toBe(false)
    expect(result.response.status).toBe(503)
    const body = await result.response.json()
    expect(body.code).toBe('DB_SCHEMA_OUT_OF_DATE')
  })

  it('resolves the DB schoolId on the happy path', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      schoolId: SCHOOL_A,
      school: { id: SCHOOL_A, active: true, subdomain: 'school-a' },
    })

    const req = buildRequest({ url: 'http://localhost:3000/api/test' })
    const result = await resolveAuthenticatedSchoolId(req, { id: 'user-a', schoolId: SCHOOL_A })

    expect(result.ok).toBe(true)
    expect(result.schoolId).toBe(SCHOOL_A)
    expect(result.response).toBeNull()
  })
})
