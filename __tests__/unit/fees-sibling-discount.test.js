import { describe, it, expect } from 'vitest'
import { computeSiblingDiscount } from '@/lib/fees/helpers'

describe('computeSiblingDiscount', () => {
  it('returns zero discount without sibling group', () => {
    expect(computeSiblingDiscount(1000, null)).toEqual({ discount: 0, discountType: null })
  })

  it('applies default 10% sibling discount', () => {
    const r = computeSiblingDiscount(1000, { discount: 0.1 })
    expect(r.discount).toBe(100)
    expect(r.discountType).toBe('sibling')
  })

  it('applies custom discount rate', () => {
    const r = computeSiblingDiscount(500, { discount: 0.15 })
    expect(r.discount).toBe(75)
  })

  it('net amount calculation via schedule amount minus discount', () => {
    const amount = 800
    const { discount } = computeSiblingDiscount(amount, { discount: 0.1 })
    expect(amount - discount).toBe(720)
  })
})
