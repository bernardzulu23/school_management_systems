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
  it('includes abbreviated school, grades, and short view URL', async () => {
    const { buildTermResultsCompleteSmsMessage } = await vi.importActual('@/lib/sms.js')
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'Jane Banda',
      schoolName: 'Nyimba East Day Secondary School',
      results: [
        { subjectName: 'English', score: 50, grade: 'D' },
        { subjectName: 'Math', score: 67, grade: 'C' },
      ],
    })

    expect(message.startsWith('Nyimba Eas:')).toBe(true)
    expect(message).toContain('Jane Banda')
    expect(message).toContain('English 50 (D)')
    expect(message).toContain('Math 67 (C)')
    expect(message).toContain('bluepeacktechnologies.com')
    expect(message).not.toContain('https://school.example.com/login')
  })

  it('should handle single subject', async () => {
    const { buildTermResultsCompleteSmsMessage, TERM_RESULTS_SMS_VIEW_URL } =
      await vi.importActual('@/lib/sms.js')
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'John',
      schoolName: 'Ndake Secondary School',
      results: [{ subjectName: 'Math', score: 67, grade: 'C' }],
    })
    expect(message).toBe(`Ndake Seco: John — Math 67 (C). View at ${TERM_RESULTS_SMS_VIEW_URL}`)
  })

  it('should return null if no results', async () => {
    const { buildTermResultsCompleteSmsMessage } = await vi.importActual('@/lib/sms.js')
    expect(
      buildTermResultsCompleteSmsMessage({
        studentName: 'John',
        schoolName: 'Ndake',
        results: [],
      })
    ).toBeNull()
  })

  it('should abbreviate long school names to 10 chars', async () => {
    const { abbreviateSchoolNameForSms, buildTermResultsCompleteSmsMessage } =
      await vi.importActual('@/lib/sms.js')
    expect(abbreviateSchoolNameForSms('')).toBe('ZSMS')
    expect(abbreviateSchoolNameForSms('Ndake Secondary School')).toBe('Ndake Seco')
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'John',
      schoolName: 'Very Long School Name Here',
      results: [{ subjectName: 'Math', score: 67, grade: 'C' }],
    })
    expect(message.split(':')[0].length).toBeLessThanOrEqual(10)
  })

  it('should sort subjects alphabetically', async () => {
    const { buildTermResultsCompleteSmsMessage } = await vi.importActual('@/lib/sms.js')
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'John Mulenga',
      schoolName: 'Ndake Secondary School',
      results: [
        { subjectName: 'Math', score: 67, grade: 'C' },
        { subjectName: 'English', score: 50, grade: 'D' },
        { subjectName: 'Geography', score: 87, grade: 'A' },
      ],
    })
    expect(message.indexOf('English')).toBeLessThan(message.indexOf('Geography'))
    expect(message.indexOf('Geography')).toBeLessThan(message.indexOf('Math'))
  })

  it('should handle missing grade field', async () => {
    const { formatResultGradeLine, buildTermResultsCompleteSmsMessage } =
      await vi.importActual('@/lib/sms.js')
    expect(formatResultGradeLine({ subjectName: 'Math', score: 67, grade: null })).toBe('Math 67')
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'John',
      schoolName: 'Ndake',
      results: [{ subjectName: 'Math', score: 67, grade: null }],
    })
    expect(message).toContain('Math 67')
    expect(message).not.toContain('(null)')
  })

  it('should keep message under 320 characters for many subjects', async () => {
    const {
      buildTermResultsCompleteSmsMessage,
      TERM_RESULTS_SMS_HARD_MAX,
      abbreviateSubjectNameForSms,
    } = await vi.importActual('@/lib/sms.js')
    expect(abbreviateSubjectNameForSms('Mathematics')).toBe('MTH')
    const results = [
      { subjectName: 'Mathematics', score: 70, grade: 'B' },
      { subjectName: 'English Language', score: 65, grade: 'C' },
      { subjectName: 'Geography', score: 80, grade: 'A' },
      { subjectName: 'History', score: 55, grade: 'D' },
      { subjectName: 'Biology', score: 72, grade: 'B' },
      { subjectName: 'Chemistry', score: 61, grade: 'C' },
      { subjectName: 'Physics', score: 58, grade: 'D' },
      { subjectName: 'Religious Education', score: 75, grade: 'B' },
    ]
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'John Mulenga',
      schoolName: 'Ndake Day Secondary School',
      results,
    })
    expect(message.length).toBeLessThanOrEqual(TERM_RESULTS_SMS_HARD_MAX)
    expect(message).toContain('bluepeacktechnologies.com')
  })
})

describe('getOnboardingSmsFrom', () => {
  it('defaults to ZSMS', async () => {
    delete process.env.ZSMS_ONBOARDING_SENDER_ID
    const { getOnboardingSmsFrom } = await vi.importActual('@/lib/sms.js')
    expect(getOnboardingSmsFrom()).toBe('ZSMS')
  })
})
