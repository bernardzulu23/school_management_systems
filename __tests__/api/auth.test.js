/**
 * Tests for POST /api/auth/login
 *
 * CRITICAL PATH: If login breaks, no teacher or student can access the platform.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/auth/login/route.js'
import { findUserByEmail } from '@/lib/db/queries'
import { resolvePublicSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getSubscriptionState } from '@/lib/billing/subscription'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'

vi.mock('@/lib/db/queries', () => ({
  findUserByEmail: vi.fn(),
}))

vi.mock('@/lib/tenant/resolveSchoolId', () => ({
  resolvePublicSchoolId: vi.fn(),
}))

vi.mock('@/lib/billing/subscription', () => ({
  getSubscriptionState: vi.fn(() => ({ expired: false, isTrialExpired: false })),
  hydrateLegacySchoolAccess: vi.fn(async (_prisma, _schoolId, school) => school),
}))

const bcryptCompare = vi.fn().mockResolvedValue(true)
vi.mock('bcryptjs', () => ({
  default: {
    compare: (...args) => bcryptCompare(...args),
  },
}))

const schoolId = 'school-test-1'
const passwordHash = '$2a$10$abcdefghijklmnopqrstuv.wxyz012345678901234567890'

const baseUser = {
  id: 'user-1',
  schoolId,
  email: 'teacher@test.com',
  password: passwordHash,
  role: 'teacher',
  name: 'Test Teacher',
  profile_picture_url: null,
  hodProfile: null,
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolvePublicSchoolId.mockResolvedValue(schoolId)
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.school.findUnique.mockResolvedValue({
      id: schoolId,
      active: true,
      emailVerified: true,
      plan: 'standard',
      planExpiresAt: new Date(Date.now() + 86400000),
      trialEndsAt: null,
    })
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' })
    bcryptCompare.mockResolvedValue(true)
  })

  it('returns 200 and sets cookies for valid credentials', async () => {
    findUserByEmail.mockResolvedValue(baseUser)

    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { email: 'teacher@test.com', password: 'CorrectP@ss1', subdomain: 'testschool' },
        headers: { host: 'testschool.localhost:3000' },
      })
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.user.email).toBe('teacher@test.com')
    expect(res.cookies.get('access_token')?.value).toBeTruthy()
    expect(res.cookies.get('refresh_token')?.value).toBeTruthy()
  })

  it('returns 403 when password is correct but does not meet policy', async () => {
    findUserByEmail.mockResolvedValue(baseUser)

    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { email: 'teacher@test.com', password: 'weakpass', subdomain: 'testschool' },
        headers: { host: 'testschool.localhost:3000' },
      })
    )

    expect(res.status).toBe(403)
    const json = await parseJson(res)
    expect(json.code).toBe('WEAK_PASSWORD')
  })

  it('returns 401 for wrong password', async () => {
    findUserByEmail.mockResolvedValue(baseUser)
    bcryptCompare.mockResolvedValue(false)

    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { email: 'teacher@test.com', password: 'wrong', subdomain: 'testschool' },
      })
    )

    expect(res.status).toBe(401)
    const json = await parseJson(res)
    expect(json.error).toBe('Invalid credentials')
  })

  it('returns 401 for non-existent user (same message — no enumeration)', async () => {
    findUserByEmail.mockResolvedValue(null)
    mockPrisma.user.findMany.mockResolvedValue([])

    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { email: 'missing@test.com', password: 'any', subdomain: 'testschool' },
      })
    )

    expect(res.status).toBe(401)
    const json = await parseJson(res)
    expect(json.error).toBe('Invalid credentials')
  })

  it('returns 400 for missing password', async () => {
    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { email: 'teacher@test.com', subdomain: 'testschool' },
      })
    )

    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.error).toMatch(/validation/i)
  })

  it('returns 402 when school subscription is expired', async () => {
    findUserByEmail.mockResolvedValue(baseUser)
    getSubscriptionState.mockReturnValue({
      expired: true,
      isTrialExpired: true,
      trialDaysTotal: 30,
    })

    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { email: 'teacher@test.com', password: 'CorrectP@ss1', subdomain: 'testschool' },
      })
    )

    expect(res.status).toBe(402)
    const json = await parseJson(res)
    expect(json.code).toBe('SUBSCRIPTION_EXPIRED')
  })
})
