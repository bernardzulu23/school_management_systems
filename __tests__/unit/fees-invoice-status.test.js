import { describe, it, expect } from 'vitest'
import { computeInvoiceStatus } from '@/lib/fees/helpers'

describe('computeInvoiceStatus', () => {
  const dueFuture = new Date('2030-01-01')
  const duePast = new Date('2020-01-01')
  const now = new Date('2025-06-01')

  it('returns paid when balance is zero', () => {
    expect(computeInvoiceStatus(1000, 1000, duePast, now)).toBe('paid')
    expect(computeInvoiceStatus(1000, 1200, duePast, now)).toBe('paid')
  })

  it('returns partial when some paid and not overdue', () => {
    expect(computeInvoiceStatus(1000, 400, dueFuture, now)).toBe('partial')
  })

  it('returns overdue when unpaid past due date', () => {
    expect(computeInvoiceStatus(1000, 0, duePast, now)).toBe('overdue')
  })

  it('returns overdue when partial past due date', () => {
    expect(computeInvoiceStatus(1000, 200, duePast, now)).toBe('overdue')
  })

  it('returns unpaid when nothing paid and due in future', () => {
    expect(computeInvoiceStatus(1000, 0, dueFuture, now)).toBe('unpaid')
  })
})
