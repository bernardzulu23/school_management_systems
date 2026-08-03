import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUnique = vi.fn()
const upsert = vi.fn()
const update = vi.fn()
const transaction = vi.fn(async (fn) => fn(tx))

const tx = {
  schoolSmsSettings: {
    findUnique: (...args) => findUnique(...args),
    upsert: (...args) => upsert(...args),
    update: (...args) => update(...args),
  },
}

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: (...args) => transaction(...args),
    schoolSmsSettings: {
      findUnique: (...args) => findUnique(...args),
      upsert: (...args) => upsert(...args),
      update: (...args) => update(...args),
    },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock('@/config/email', () => ({
  sendSmsLowBalanceEmail: vi.fn().mockResolvedValue(false),
}))

describe('SMS credit ledger', () => {
  beforeEach(() => {
    findUnique.mockReset()
    upsert.mockReset()
    update.mockReset()
    transaction.mockImplementation(async (fn) => fn(tx))
    vi.resetModules()
  })

  it('grants trial credits once and is idempotent on second call', async () => {
    const { grantSmsCredits, TRIAL_SMS_CREDITS } = await import('@/lib/sms/balance')

    findUnique.mockResolvedValueOnce(null)
    upsert.mockResolvedValueOnce({
      schoolId: 's1',
      smsBalance: TRIAL_SMS_CREDITS,
      smsLifetimeGranted: TRIAL_SMS_CREDITS,
      smsLifetimeUsed: 0,
      trialSmsGrantedAt: new Date('2026-08-01T00:00:00Z'),
    })

    const first = await grantSmsCredits('s1', TRIAL_SMS_CREDITS, { trial: true })
    expect(first.ok).toBe(true)
    expect(first.granted).toBe(true)
    expect(first.smsBalance).toBe(50)
    expect(upsert).toHaveBeenCalledTimes(1)

    findUnique.mockResolvedValueOnce({
      schoolId: 's1',
      smsBalance: 48,
      smsLifetimeGranted: 50,
      smsLifetimeUsed: 2,
      trialSmsGrantedAt: new Date('2026-08-01T00:00:00Z'),
    })

    const second = await grantSmsCredits('s1', TRIAL_SMS_CREDITS, { trial: true })
    expect(second.ok).toBe(true)
    expect(second.granted).toBe(false)
    expect(second.reason).toBe('already_granted')
    expect(second.smsBalance).toBe(48)
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it('increments smsLifetimeUsed when reserving credits', async () => {
    const { reserveSmsCredits } = await import('@/lib/sms/balance')

    upsert.mockResolvedValueOnce({ schoolId: 's1', smsBalance: 50 })
    findUnique.mockResolvedValueOnce({
      schoolId: 's1',
      smsBalance: 50,
      smsLifetimeUsed: 0,
    })
    update.mockResolvedValueOnce({ schoolId: 's1', smsBalance: 48 })

    const result = await reserveSmsCredits('s1', 2)
    expect(result.ok).toBe(true)
    expect(result.balance).toBe(48)
    expect(update).toHaveBeenCalledWith({
      where: { schoolId: 's1' },
      data: {
        smsBalance: { decrement: 2 },
        smsLifetimeUsed: { increment: 2 },
      },
    })
  })

  it('fails reserve when balance is insufficient', async () => {
    const { reserveSmsCredits } = await import('@/lib/sms/balance')

    upsert.mockResolvedValueOnce({ schoolId: 's1', smsBalance: 0 })
    findUnique.mockResolvedValueOnce({ schoolId: 's1', smsBalance: 0 })

    const result = await reserveSmsCredits('s1', 2)
    expect(result.ok).toBe(false)
    expect(result.balance).toBe(0)
    expect(result.reason).toMatch(/Insufficient SMS credits/)
    expect(update).not.toHaveBeenCalled()
  })

  it('decrements smsLifetimeUsed on refund (floored at 0)', async () => {
    const { refundSmsCredit } = await import('@/lib/sms/balance')

    upsert.mockResolvedValueOnce({ schoolId: 's1', smsBalance: 1 })
    findUnique.mockResolvedValueOnce({
      schoolId: 's1',
      smsBalance: 1,
      smsLifetimeUsed: 1,
    })
    update.mockResolvedValueOnce({ schoolId: 's1', smsLifetimeUsed: 0 })

    await refundSmsCredit('s1', 1)
    expect(update).toHaveBeenCalledWith({
      where: { schoolId: 's1' },
      data: { smsLifetimeUsed: 0 },
    })
  })
})
