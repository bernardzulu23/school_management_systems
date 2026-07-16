import { beforeEach, describe, expect, it, vi } from 'vitest'

const findUnique = vi.fn()
const authMiddleware = vi.fn()
const hydrateLegacySchoolAccess = vi.fn()
const getSubscriptionState = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    school: { findUnique },
  },
}))

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware,
}))

vi.mock('@/lib/billing/subscription', () => ({
  hydrateLegacySchoolAccess,
  getSubscriptionState,
}))

vi.unmock('@/lib/middleware/subscriptionGate')

describe('enforceSubscriptionIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'user-1', schoolId: 'school-1' },
    })
    hydrateLegacySchoolAccess.mockImplementation(async (_prisma, _schoolId, school) => school)
    getSubscriptionState.mockReturnValue({ active: true })
  })

  it('returns a 503 schema message when School table is missing', async () => {
    const { enforceSubscriptionIfNeeded } = await import('@/lib/middleware/subscriptionGate')
    findUnique.mockRejectedValueOnce(
      Object.assign(
        new Error('The table `public.School` does not exist in the current database.'),
        {
          code: 'P2021',
        }
      )
    )

    const request = new Request('https://example.com/api/notifications/list')
    const response = await enforceSubscriptionIfNeeded(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('Database schema out of date')
    expect(body.message).toMatch(/prisma migrate deploy/i)
  })

  it('returns null when the subscription is active', async () => {
    const { enforceSubscriptionIfNeeded } = await import('@/lib/middleware/subscriptionGate')
    findUnique.mockResolvedValueOnce({
      id: 'school-1',
      active: true,
      plan: 'premium',
      planExpiresAt: new Date(Date.now() + 86400000),
      trialEndsAt: null,
      createdAt: new Date(),
      emailVerified: true,
      schoolType: 'SCHOOL',
    })

    const request = new Request('https://example.com/api/notifications/list')
    const response = await enforceSubscriptionIfNeeded(request)

    expect(response).toBeNull()
  })
})
