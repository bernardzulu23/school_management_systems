import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendMoceanSms = vi.fn()
const sendSMS = vi.fn()
const queueForGatewayIfEnabled = vi.fn()
const smsLogCreate = vi.fn()

vi.mock('@/lib/sms/mocean', () => ({
  isMoceanConfigured: vi.fn(() => Boolean(process.env.MOCEAN_API_TOKEN)),
  sendMoceanSms: (...args) => sendMoceanSms(...args),
}))

vi.mock('@/lib/sms/africastalking', () => ({
  sendSMS: (...args) => sendSMS(...args),
}))

vi.mock('@/lib/config/env', () => ({
  env: {
    atApiKey: process.env.AFRICASTALKING_API_KEY || 'at-key',
    atUsername: process.env.AFRICASTALKING_USERNAME || 'sandbox',
  },
}))

vi.mock('@/lib/sms/queueForGateway', () => ({
  queueForGatewayIfEnabled: (...args) => queueForGatewayIfEnabled(...args),
}))

vi.mock('@/lib/prisma/client', () => ({
  basePrisma: {
    smsLog: {
      create: (...args) => smsLogCreate(...args),
    },
  },
}))

describe('sendOutboundSms (gateway sole channel)', () => {
  beforeEach(() => {
    sendMoceanSms.mockReset()
    sendSMS.mockReset()
    queueForGatewayIfEnabled.mockReset()
    smsLogCreate.mockReset()
    smsLogCreate.mockResolvedValue({ id: 'log-1' })
    delete process.env.MOCEAN_API_TOKEN
    process.env.AFRICASTALKING_API_KEY = 'at-key'
    process.env.AFRICASTALKING_USERNAME = 'sandbox'
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.MOCEAN_API_TOKEN
  })

  it('queues via custom gateway when enabled and does not call Mocean/AT', async () => {
    queueForGatewayIfEnabled.mockResolvedValue({
      queued: true,
      messageIds: ['m1'],
      recipients: ['+260971234567'],
    })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      schoolId: 'school-1',
    })

    expect(result.ok).toBe(true)
    expect(result.provider).toBe('custom_gateway')
    expect(result.queuedForGateway).toBe(true)
    expect(sendMoceanSms).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('stops with FAILED_NO_FALLBACK when gateway enabled but cannot queue', async () => {
    queueForGatewayIfEnabled.mockResolvedValue({
      queued: false,
      reason: 'no_active_gateway',
    })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      schoolId: 'school-1',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('gateway_failed_no_fallback_enabled')
    expect(result.failureReason).toBe('gateway_unavailable_no_fallback')
    expect(sendMoceanSms).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
    expect(smsLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED_NO_FALLBACK',
          failureReason: 'gateway_unavailable_no_fallback',
          schoolId: 'school-1',
          recipient: '+260971234567',
        }),
      })
    )
  })

  it('does not call Mocean/AT when legacy fallback is disabled (default)', async () => {
    process.env.MOCEAN_API_TOKEN = 'mocean-token'
    sendMoceanSms.mockResolvedValue({ success: true, results: [], msgid: 'm1' })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      from: 'ZSMS',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('gateway_failed_no_fallback_enabled')
    expect(sendMoceanSms).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
  })
})

describe('buildTermResultsCompleteSmsMessage', () => {
  it('prefixes message with school name when login URL is present', async () => {
    const { buildTermResultsCompleteSmsMessage } = await vi.importActual('@/lib/sms.js')
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'Jane Banda',
      loginUrl: 'https://school.example.com/login',
      schoolName: 'Nyimba East Day Secondary School',
    })

    expect(message.startsWith('Nyimba East Day Secondary School:')).toBe(true)
    expect(message).toContain('Jane Banda')
    expect(message).toContain('https://school.example.com/login')
    expect(message).not.toContain('- Nyimba East')
  })
})

describe('getOnboardingSmsFrom', () => {
  it('defaults to ZSMS', async () => {
    delete process.env.ZSMS_ONBOARDING_SENDER_ID
    const { getOnboardingSmsFrom } = await vi.importActual('@/lib/sms.js')
    expect(getOnboardingSmsFrom()).toBe('ZSMS')
  })
})
