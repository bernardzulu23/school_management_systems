/**
 * Tests for onboarding payment gate and Lipila callback.
 *
 * CRITICAL PATH: Revenue gate — must block unpaid schools and accept confirmed payments.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { POST as completeOnboarding } from '@/app/api/onboarding/complete/route.js'
import { POST as lipilaCallback } from '@/app/api/onboarding/lipila/callback/route.js'
import { signOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'

const registrationId = 'reg-test-001'
const onboardingCookie = () => {
  const token = signOnboardingToken(registrationId)
  return { onboarding_token: token }
}

const baseRegistration = {
  id: registrationId,
  email: 'admin@newschool.com',
  passwordHash: 'hashed',
  isVerified: true,
  plan: 'standard',
  paymentStatus: 'paid',
  subscriptionMonths: 1,
}

const locationBody = { province: 'Lusaka', district: 'Lusaka' }

describe('Onboarding payment gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.schoolRegistration.findUnique.mockResolvedValue(baseRegistration)
    mockPrisma.school.findFirst.mockResolvedValue(null)
    mockPrisma.schoolRegistration.update.mockResolvedValue({})
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        school: {
          create: vi.fn().mockResolvedValue({
            id: 'school-new-1',
            name: 'New School',
            subdomain: 'newschool',
          }),
          update: vi.fn().mockResolvedValue({ id: 'school-new-1' }),
        },
        user: { create: vi.fn().mockResolvedValue({ id: 'user-new-1' }) },
        schoolRegistration: { update: vi.fn().mockResolvedValue({}) },
        subject: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        schoolSmsSettings: {
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue({
            schoolId: 'school-new-1',
            smsBalance: 50,
            smsLifetimeGranted: 50,
            smsLifetimeUsed: 0,
            trialSmsGrantedAt: new Date(),
          }),
          create: vi.fn().mockResolvedValue({
            schoolId: 'school-new-1',
            smsBalance: 50,
            smsLifetimeGranted: 50,
            smsLifetimeUsed: 0,
            trialSmsGrantedAt: new Date(),
          }),
          update: vi.fn().mockResolvedValue({
            schoolId: 'school-new-1',
            smsBalance: 50,
            smsLifetimeGranted: 50,
            smsLifetimeUsed: 0,
            trialSmsGrantedAt: new Date(),
          }),
        },
      }
      return fn(tx)
    })
  })

  it('POST /api/onboarding/complete with paymentStatus=paid creates school', async () => {
    const res = await completeOnboarding(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/onboarding/complete',
        cookies: onboardingCookie(),
        body: {
          schoolName: 'New School',
          subdomain: 'newschool',
          level: 'secondary',
          adminName: 'Head Teacher',
          ...locationBody,
        },
      })
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.school).toBeTruthy()
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('POST /api/onboarding/complete with paymentStatus=pending returns 402', async () => {
    mockPrisma.schoolRegistration.findUnique.mockResolvedValue({
      ...baseRegistration,
      paymentStatus: 'pending',
    })

    const res = await completeOnboarding(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/onboarding/complete',
        cookies: onboardingCookie(),
        body: {
          schoolName: 'New School',
          subdomain: 'newschool',
          level: 'secondary',
          adminName: 'Head Teacher',
        },
      })
    )

    expect(res.status).toBe(402)
    const json = await parseJson(res)
    expect(json.error).toMatch(/payment/i)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('POST /api/onboarding/complete with paymentStatus=failed returns 402', async () => {
    mockPrisma.schoolRegistration.findUnique.mockResolvedValue({
      ...baseRegistration,
      paymentStatus: 'failed',
    })

    const res = await completeOnboarding(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/onboarding/complete',
        cookies: onboardingCookie(),
        body: {
          schoolName: 'New School',
          subdomain: 'newschool',
          level: 'secondary',
          adminName: 'Head Teacher',
        },
      })
    )

    expect(res.status).toBe(402)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('allows trial plan without paid paymentStatus', async () => {
    mockPrisma.schoolRegistration.findUnique.mockResolvedValue({
      ...baseRegistration,
      plan: 'trial',
      paymentStatus: 'unpaid',
    })

    const res = await completeOnboarding(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/onboarding/complete',
        cookies: onboardingCookie(),
        body: {
          schoolName: 'Trial School',
          subdomain: 'trialschool',
          level: 'primary',
          adminName: 'Trial Admin',
          province: 'Eastern',
          district: 'Chipata',
        },
      })
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

describe('POST /api/onboarding/lipila/callback', () => {
  const webhookSecret = 'test-lipila-webhook-secret'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LIPILA_WEBHOOK_SECRET = webhookSecret
    mockPrisma.schoolRegistration.findFirst.mockResolvedValue({
      id: registrationId,
      paymentStatus: 'pending',
      paymentReference: null,
    })
    mockPrisma.schoolRegistration.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.paymentLedgerEntry.create.mockResolvedValue({ id: 'led-1' })
  })

  it('rejects callbacks without webhook secret', async () => {
    const res = await lipilaCallback(
      buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/onboarding/lipila/callback',
        body: {
          identifier: registrationId,
          referenceId: 'LPLXC-TEST-000',
          status: 'Successful',
        },
      })
    )
    expect(res.status).toBe(401)
    expect(mockPrisma.schoolRegistration.updateMany).not.toHaveBeenCalled()
  })

  it('marks registration paid on successful Lipila payload', async () => {
    const res = await lipilaCallback(
      buildRequest({
        method: 'POST',
        url: `http://localhost:3000/api/onboarding/lipila/callback?webhook_secret=${webhookSecret}`,
        body: {
          identifier: registrationId,
          referenceId: 'LPLXC-TEST-001',
          status: 'Successful',
        },
      })
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.schoolRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'paid' }),
      })
    )
  })

  it('does not mark paid when status is failed', async () => {
    const res = await lipilaCallback(
      buildRequest({
        method: 'POST',
        url: `http://localhost:3000/api/onboarding/lipila/callback?webhook_secret=${webhookSecret}`,
        body: {
          identifier: registrationId,
          referenceId: 'LPLXC-TEST-002',
          status: 'Failed',
        },
      })
    )

    expect(res.status).toBe(200)
    const paidCalls = mockPrisma.schoolRegistration.updateMany.mock.calls.filter(
      (call) => call[0]?.data?.paymentStatus === 'paid'
    )
    expect(paidCalls.length).toBe(0)
    expect(mockPrisma.schoolRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'failed' }),
      })
    )
  })

  it('returns 200 with no update when payload has no identifier or reference', async () => {
    const res = await lipilaCallback(
      buildRequest({
        method: 'POST',
        url: `http://localhost:3000/api/onboarding/lipila/callback?webhook_secret=${webhookSecret}`,
        body: { status: 'Successful' },
      })
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.schoolRegistration.updateMany).not.toHaveBeenCalled()
  })

  it('rejects operator-object identifier payloads with 400', async () => {
    const res = await lipilaCallback(
      buildRequest({
        method: 'POST',
        url: `http://localhost:3000/api/onboarding/lipila/callback?webhook_secret=${webhookSecret}`,
        body: {
          identifier: { $ne: null },
          referenceId: 'LPLXC-TEST-003',
          status: 'Successful',
        },
      })
    )

    expect(res.status).toBe(400)
    expect(mockPrisma.schoolRegistration.updateMany).not.toHaveBeenCalled()
  })
})
