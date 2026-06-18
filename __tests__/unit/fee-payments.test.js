import { describe, it, expect } from 'vitest'
import { normalizeFeePaymentStatus, serializeFeePayment } from '@/lib/payments/feePayments'

describe('feePayments', () => {
  it('normalizes Lipila and stored statuses for the UI', () => {
    expect(normalizeFeePaymentStatus('Paid')).toBe('completed')
    expect(normalizeFeePaymentStatus('Success')).toBe('completed')
    expect(normalizeFeePaymentStatus('Pending')).toBe('pending')
    expect(normalizeFeePaymentStatus('Failed')).toBe('failed')
    expect(normalizeFeePaymentStatus('completed')).toBe('completed')
  })

  it('serializes a payment record for the dashboard API', () => {
    const row = {
      id: 'pay-1',
      amount: 1,
      currency: 'ZMW',
      provider: 'airtel',
      referenceId: 'ref-73',
      status: 'completed',
      accountNumber: '260971234567',
      narration: 'Tuition Fees',
      paymentType: 'tuition',
      studentId: null,
      createdAt: new Date('2026-06-19T00:54:00.000Z'),
    }
    expect(serializeFeePayment(row)).toMatchObject({
      id: 'pay-1',
      amount: 1,
      status: 'completed',
      referenceId: 'ref-73',
      type: 'tuition',
      phone: '260971234567',
    })
  })
})
