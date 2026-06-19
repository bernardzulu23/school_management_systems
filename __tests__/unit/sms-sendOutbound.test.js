import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendMoceanSms = vi.fn()
const sendSMS = vi.fn()

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

describe('sendOutboundSms', () => {
  beforeEach(() => {
    sendMoceanSms.mockReset()
    sendSMS.mockReset()
    delete process.env.MOCEAN_API_TOKEN
    process.env.AFRICASTALKING_API_KEY = 'at-key'
    process.env.AFRICASTALKING_USERNAME = 'sandbox'
  })

  afterEach(() => {
    delete process.env.MOCEAN_API_TOKEN
  })

  it('uses Mocean when MOCEAN_API_TOKEN is set', async () => {
    process.env.MOCEAN_API_TOKEN = 'mocean-token'
    sendMoceanSms.mockResolvedValue({
      success: true,
      results: [{ status: 0, msgid: 'm1' }],
      msgid: 'm1',
    })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      from: 'ZSMS',
    })

    expect(result.ok).toBe(true)
    expect(result.provider).toBe('mocean')
    expect(sendMoceanSms).toHaveBeenCalledWith(['+260971234567'], 'Hello', 'ZSMS')
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it("falls back to Africa's Talking when Mocean is not configured", async () => {
    sendSMS.mockResolvedValue({ success: true, results: [{ status: 'Success' }] })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      from: 'ZSMS',
    })

    expect(result.ok).toBe(true)
    expect(result.provider).toBe('africastalking')
    expect(sendSMS).toHaveBeenCalledWith(['+260971234567'], 'Hello', 'ZSMS', { enqueue: true })
    expect(sendMoceanSms).not.toHaveBeenCalled()
  })

  it('returns not configured when no provider credentials exist', async () => {
    delete process.env.AFRICASTALKING_API_KEY
    delete process.env.AFRICASTALKING_USERNAME

    vi.resetModules()
    vi.doMock('@/lib/config/env', () => ({
      env: { atApiKey: '', atUsername: '' },
    }))

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
    })

    expect(result.ok).toBe(false)
    expect(result.provider).toBe(null)
    expect(result.reason).toBe('SMS not configured')
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
