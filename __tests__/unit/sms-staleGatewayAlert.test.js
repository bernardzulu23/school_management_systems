import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const findMany = vi.fn()
const update = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/lib/prisma/client', () => ({
  basePrisma: {
    sMSGateway: {
      findMany: (...args) => findMany(...args),
      update: (...args) => update(...args),
    },
  },
}))

describe('runStaleGatewayHealthCron', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    findMany.mockReset()
    update.mockReset()
    fetchMock.mockReset()
    global.fetch = fetchMock
    process.env.TELEGRAM_BOT_TOKEN = 'tok'
    process.env.TELEGRAM_CHAT_ID = '123'
    process.env.CALLMEBOT_PHONE = '260971234567'
    process.env.CALLMEBOT_APIKEY = 'cm-key'
    vi.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    delete process.env.CALLMEBOT_PHONE
    delete process.env.CALLMEBOT_APIKEY
  })

  it('fans out to Telegram + WhatsApp once for a stale gateway and skips if already alerted', async () => {
    const staleAt = new Date(Date.now() - 20 * 60 * 1000)
    findMany.mockResolvedValue([
      {
        id: 'gw-1',
        deviceName: 'Pixel',
        lastSeenAt: staleAt,
        lastStaleAlertSentAt: null,
        school: { id: 's1', name: 'Test School' },
      },
      {
        id: 'gw-2',
        deviceName: 'Already',
        lastSeenAt: staleAt,
        lastStaleAlertSentAt: new Date(),
        school: { id: 's2', name: 'Other' },
      },
    ])
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' })
    update.mockResolvedValue({})

    const { runStaleGatewayHealthCron } = await import('@/lib/sms/staleGatewayAlert')
    const result = await runStaleGatewayHealthCron()

    expect(result.checked).toBe(2)
    expect(result.stale).toBe(2)
    expect(result.alerted).toBe(1)
    expect(result.skippedAlreadyAlerted).toBe(1)
    // Dual channel: Telegram POST + CallMeBot GET
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const telegramCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('api.telegram.org'))
    const whatsappCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('api.callmebot.com')
    )
    expect(telegramCall).toBeTruthy()
    expect(whatsappCall).toBeTruthy()

    const body = JSON.parse(telegramCall[1].body)
    expect(body.text).toContain('SMS Gateway Offline')
    expect(body.text).toContain('Test School')
    expect(body.text).toContain('No fallback is active')
    expect(String(whatsappCall[0])).toContain(encodeURIComponent('SMS Gateway Offline'))

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'gw-1' },
        data: expect.objectContaining({ lastStaleAlertSentAt: expect.any(Date) }),
      })
    )
  })

  it('still marks episode when only one channel succeeds', async () => {
    const staleAt = new Date(Date.now() - 20 * 60 * 1000)
    findMany.mockResolvedValue([
      {
        id: 'gw-1',
        deviceName: 'Pixel',
        lastSeenAt: staleAt,
        lastStaleAlertSentAt: null,
        school: { id: 's1', name: 'Test School' },
      },
    ])
    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes('telegram.org')) return { ok: true, text: async () => '' }
      return { ok: false, status: 500, text: async () => 'fail' }
    })
    update.mockResolvedValue({})

    const { runStaleGatewayHealthCron } = await import('@/lib/sms/staleGatewayAlert')
    const result = await runStaleGatewayHealthCron()

    expect(result.alerted).toBe(1)
    expect(update).toHaveBeenCalled()
  })

  it('does not set lastStaleAlertSentAt when both channels fail (retry next tick)', async () => {
    const staleAt = new Date(Date.now() - 20 * 60 * 1000)
    findMany.mockResolvedValue([
      {
        id: 'gw-1',
        deviceName: 'Pixel',
        lastSeenAt: staleAt,
        lastStaleAlertSentAt: null,
        school: { id: 's1', name: 'Test School' },
      },
    ])
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'nope' })

    const { runStaleGatewayHealthCron } = await import('@/lib/sms/staleGatewayAlert')
    const result = await runStaleGatewayHealthCron()

    expect(result.alerted).toBe(0)
    expect(update).not.toHaveBeenCalled()
  })

  it('does not alert for freshly seen gateways', async () => {
    findMany.mockResolvedValue([
      {
        id: 'gw-ok',
        deviceName: 'Online',
        lastSeenAt: new Date(),
        lastStaleAlertSentAt: null,
        school: { id: 's1', name: 'Online School' },
      },
    ])

    const { runStaleGatewayHealthCron } = await import('@/lib/sms/staleGatewayAlert')
    const result = await runStaleGatewayHealthCron()

    expect(result.stale).toBe(0)
    expect(result.alerted).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
