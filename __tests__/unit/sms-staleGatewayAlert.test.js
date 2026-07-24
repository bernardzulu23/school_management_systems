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
    vi.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
  })

  it('alerts once for a stale gateway and skips if already alerted', async () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toContain('SMS Gateway Offline')
    expect(body.text).toContain('Test School')
    expect(body.text).toContain('No fallback is active')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'gw-1' },
        data: expect.objectContaining({ lastStaleAlertSentAt: expect.any(Date) }),
      })
    )
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
