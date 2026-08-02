import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUnique = vi.fn()
const findFirst = vi.fn()
const smsLogCreate = vi.fn()

vi.mock('@/lib/prisma/client', () => ({
  basePrisma: {
    schoolSmsSettings: { findUnique: (...args) => findUnique(...args) },
    sMSGateway: { findFirst: (...args) => findFirst(...args) },
    smsLog: { create: (...args) => smsLogCreate(...args) },
  },
}))

vi.mock('@/lib/sms/resolveGateway', () => ({
  resolveActiveGatewayForSchool: (...args) => findFirst(...args),
}))

describe('queueForGatewayIfEnabled online window', () => {
  beforeEach(() => {
    findUnique.mockReset()
    findFirst.mockReset()
    smsLogCreate.mockReset()
    vi.resetModules()
  })

  it('returns gateway_offline when lastSeenAt is stale', async () => {
    findUnique.mockResolvedValue({ customGatewayEnabled: true })
    findFirst.mockResolvedValue({
      id: 'gw-1',
      lastSeenAt: new Date(Date.now() - 10 * 60 * 1000),
    })

    const { queueForGatewayIfEnabled } = await import('@/lib/sms/queueForGateway')
    const result = await queueForGatewayIfEnabled({
      schoolId: 'school-1',
      to: '+260971234567',
      message: 'Hello',
    })

    expect(result).toEqual({ queued: false, reason: 'gateway_offline' })
    expect(smsLogCreate).not.toHaveBeenCalled()
  })

  it('returns gateway_offline when lastSeenAt is null', async () => {
    findUnique.mockResolvedValue({ customGatewayEnabled: true })
    findFirst.mockResolvedValue({ id: 'gw-1', lastSeenAt: null })

    const { queueForGatewayIfEnabled } = await import('@/lib/sms/queueForGateway')
    const result = await queueForGatewayIfEnabled({
      schoolId: 'school-1',
      to: '+260971234567',
      message: 'Hello',
    })

    expect(result.reason).toBe('gateway_offline')
    expect(result.queued).toBe(false)
  })

  it('queues when gateway was seen within 5 minutes', async () => {
    findUnique.mockResolvedValue({ customGatewayEnabled: true })
    findFirst.mockResolvedValue({
      id: 'gw-1',
      lastSeenAt: new Date(Date.now() - 60 * 1000),
    })
    smsLogCreate.mockResolvedValue({ id: 'log-1' })

    const { queueForGatewayIfEnabled } = await import('@/lib/sms/queueForGateway')
    const result = await queueForGatewayIfEnabled({
      schoolId: 'school-1',
      to: '+260971234567',
      message: 'Hello',
    })

    expect(result.queued).toBe(true)
    expect(result.messageIds).toEqual(['log-1'])
    expect(smsLogCreate).toHaveBeenCalled()
  })
})
