/**
 * Tests for POST /api/auth/refresh — valid JWT without DB row should still refresh.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-minimum-32-chars'
const userId = 'user-refresh-1'
const schoolId = 'school-refresh-1'

const cookieBag = {}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name) => {
      const value = cookieBag[name]
      return value !== undefined ? { value } : undefined
    },
  })),
}))

vi.mock('@/lib/security/csrf', () => ({
  setCsrfCookie: vi.fn(),
}))

const { POST } = await import('@/app/api/auth/refresh/route.js')

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(cookieBag).forEach((k) => delete cookieBag[k])
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null)
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-new' })
    mockPrisma.refreshToken.update.mockResolvedValue({ id: 'rt-old' })
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.$transaction.mockImplementation(async (ops) => {
      for (const op of ops) await op
    })
    mockPrisma.user.findFirst.mockResolvedValue({
      id: userId,
      email: 't@test.com',
      role: 'teacher',
      schoolId,
    })
  })

  it('refreshes when JWT is valid but refresh token row is missing from DB', async () => {
    const refreshToken = jwt.sign({ id: userId, schoolId }, JWT_REFRESH_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    })
    cookieBag.refresh_token = refreshToken

    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/refresh',
        headers: { host: 'testschool.localhost:3000' },
      })
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled()
    expect(res.cookies.get('access_token')?.value).toBeTruthy()
    expect(res.cookies.get('refresh_token')?.value).toBeTruthy()
  })

  it('returns 401 when refresh token is revoked in DB', async () => {
    const refreshToken = jwt.sign({ id: userId, schoolId }, JWT_REFRESH_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    })
    cookieBag.refresh_token = refreshToken

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-old',
      token: refreshToken,
      revoked: true,
      userId,
    })

    const res = await POST(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/refresh',
        headers: { host: 'testschool.localhost:3000' },
      })
    )

    expect(res.status).toBe(401)
    const json = await parseJson(res)
    expect(json.stopRetry).toBe(true)
  })
})
