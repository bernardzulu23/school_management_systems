import { MobileMoneySystem } from '@/lib/mobileMoneySystem'

describe('MobileMoneySystem', () => {
  let mmSystem

  beforeEach(() => {
    mmSystem = new MobileMoneySystem()
    // Mock global fetch
    global.fetch = jest.fn()
  })

  test('initializes with supported providers', () => {
    expect(mmSystem.supportedProviders.has('airtel')).toBe(true)
    expect(mmSystem.supportedProviders.has('mtn')).toBe(true)
    expect(mmSystem.supportedProviders.has('zamtel')).toBe(true)
  })

  test('detects provider from phone number', () => {
    // Airtel prefixes: 96, 97, 76, 77
    expect(mmSystem.detectProvider('0971234567')).toBe('airtel')
    // MTN prefixes: 95, 96, 75, 78
    expect(mmSystem.detectProvider('0951234567')).toBe('mtn')
    // Zamtel prefixes: 94, 21, 22, 23
    expect(mmSystem.detectProvider('0941234567')).toBe('zamtel')
    // Unknown
    expect(mmSystem.detectProvider('0111234567')).toBeNull()
  })

  test('processes payment successfully', async () => {
    const paymentData = {
      phoneNumber: '0971234567',
      amount: 100,
      feeType: 'school_fees',
      studentId: 'STU001',
      reference: 'REF001'
    }

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactionId: 'TXN_PROV_001', success: true })
    })

    const transaction = await mmSystem.processPayment(paymentData)

    expect(transaction.status).toBe('completed')
    expect(transaction.amount).toBe(100)
    expect(transaction.provider).toBe('airtel')
    expect(transaction.providerTransactionId).toBe('TXN_PROV_001')
  })

  test('throws error for unsupported provider', async () => {
    const paymentData = {
      phoneNumber: '0111234567',
      amount: 100,
      feeType: 'school_fees'
    }

    await expect(mmSystem.processPayment(paymentData)).rejects.toThrow('Unsupported mobile money provider')
  })

  test('validates transaction limits', async () => {
    const paymentData = {
      phoneNumber: '0971234567',
      amount: 0.5, // Below minimum K1
      feeType: 'school_fees'
    }

    await expect(mmSystem.processPayment(paymentData)).rejects.toThrow('Minimum transaction amount is K1')
  })

  test('calculates statistics correctly', async () => {
    mmSystem.transactionHistory = [
      { status: 'completed', amount: 100, transactionFee: 2, provider: 'airtel' },
      { status: 'completed', amount: 200, transactionFee: 4, provider: 'mtn' },
      { status: 'failed', amount: 50, transactionFee: 1, provider: 'airtel' }
    ]

    const stats = mmSystem.getMobileMoneyStats()
    expect(stats.totalTransactions).toBe(2)
    expect(stats.totalAmount).toBe(300)
    expect(stats.successRate).toBe("66.7")
  })
})
