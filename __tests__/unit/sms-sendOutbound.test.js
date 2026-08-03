import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendSMS = vi.fn()
const queueForGatewayIfEnabled = vi.fn()
const smsLogCreate = vi.fn()

vi.mock('@/lib/sms/africastalking', () => ({
  sendSMS: (...args) => sendSMS(...args),
}))

vi.mock('@/lib/config/env', () => ({
  env: {
    get atApiKey() {
      return process.env.AFRICASTALKING_API_KEY || null
    },
    get atUsername() {
      return process.env.AFRICASTALKING_USERNAME || null
    },
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

describe("sendOutboundSms (Africa's Talking primary)", () => {
  beforeEach(() => {
    sendSMS.mockReset()
    queueForGatewayIfEnabled.mockReset()
    smsLogCreate.mockReset()
    smsLogCreate.mockResolvedValue({ id: 'log-1' })
    process.env.AFRICASTALKING_API_KEY = 'at-key'
    process.env.AFRICASTALKING_USERNAME = 'sandbox'
    delete process.env.SMS_PREFER_CUSTOM_GATEWAY
    vi.resetModules()
  })

  it("uses Africa's Talking first and does not queue gateway on success", async () => {
    sendSMS.mockResolvedValue({
      success: true,
      results: [{ messageId: 'AT1', statusCode: 100 }],
    })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      schoolId: 'school-1',
    })

    expect(result.ok).toBe(true)
    expect(result.provider).toBe('africastalking')
    expect(result.queuedForGateway).toBe(false)
    expect(sendSMS).toHaveBeenCalled()
    expect(queueForGatewayIfEnabled).not.toHaveBeenCalled()
    expect(smsLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          provider: 'africastalking',
          channel: 'AFRICALA',
          schoolId: 'school-1',
          recipient: '+260971234567',
        }),
      })
    )
  })

  it('falls back to custom gateway when AT fails', async () => {
    sendSMS.mockResolvedValue({ success: false, reason: 'Carrier error', results: [] })
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
    expect(queueForGatewayIfEnabled).toHaveBeenCalled()
  })

  it('uses gateway first when SMS_PREFER_CUSTOM_GATEWAY=true', async () => {
    process.env.SMS_PREFER_CUSTOM_GATEWAY = 'true'
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
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it("uses Africa's Talking when no schoolId (no gateway fork)", async () => {
    sendSMS.mockResolvedValue({ success: true, results: [] })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      from: 'ZSMS',
    })

    expect(queueForGatewayIfEnabled).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    expect(result.provider).toBe('africastalking')
    expect(sendSMS).toHaveBeenCalled()
  })

  it('returns SMS not configured when AT credentials missing and gateway unavailable', async () => {
    delete process.env.AFRICASTALKING_API_KEY
    delete process.env.AFRICASTALKING_USERNAME
    queueForGatewayIfEnabled.mockResolvedValue({
      queued: false,
      reason: 'flag_off',
    })

    const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
    const result = await sendOutboundSms({
      to: '+260971234567',
      message: 'Hello',
      schoolId: 'school-1',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('SMS not configured')
    expect(sendSMS).not.toHaveBeenCalled()
  })
})

describe('buildTermResultsCompleteSmsMessage', () => {
  it('includes abbreviated school, scores only (no grade labels), and short view URL', async () => {
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
    expect(message).toContain('English 50')
    expect(message).toContain('Math 67')
    expect(message).not.toContain('(D)')
    expect(message).not.toContain('(C)')
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
    expect(message).toBe(`Ndake Seco: John — Math 67. View at ${TERM_RESULTS_SMS_VIEW_URL}`)
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

  it('should ignore grade labels and send scores only', async () => {
    const { formatResultGradeLine, buildTermResultsCompleteSmsMessage } =
      await vi.importActual('@/lib/sms.js')
    expect(formatResultGradeLine({ subjectName: 'Math', score: 67, grade: 'C' })).toBe('Math 67')
    expect(formatResultGradeLine({ subjectName: 'Math', score: 67, grade: null })).toBe('Math 67')
    const message = buildTermResultsCompleteSmsMessage({
      studentName: 'John',
      schoolName: 'Ndake',
      results: [{ subjectName: 'Math', score: 67, grade: 'ONE' }],
    })
    expect(message).toContain('Math 67')
    expect(message).not.toContain('(ONE)')
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

describe('prefixSchoolNameToSms', () => {
  it('prefixes school name when missing', async () => {
    const { prefixSchoolNameToSms } = await vi.importActual('@/lib/sms.js')
    expect(prefixSchoolNameToSms('Ndake Day Secondary', 'Meeting at 10am')).toBe(
      'Ndake Day Secondary: Meeting at 10am'
    )
  })

  it('does not double-prefix when message already starts with school name', async () => {
    const { prefixSchoolNameToSms } = await vi.importActual('@/lib/sms.js')
    const msg = 'Ndake Day Secondary: already tagged'
    expect(prefixSchoolNameToSms('Ndake Day Secondary', msg)).toBe(msg)
    expect(prefixSchoolNameToSms('ndake day secondary', msg)).toBe(msg)
  })

  it('returns trimmed empty input unchanged', async () => {
    const { prefixSchoolNameToSms } = await vi.importActual('@/lib/sms.js')
    expect(prefixSchoolNameToSms('Ndake', '   ')).toBe('')
    expect(prefixSchoolNameToSms('', 'Hello parents')).toBe('Hello parents')
  })
})
