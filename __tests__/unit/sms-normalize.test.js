import { describe, it, expect } from 'vitest'
import { normalizeZmPhoneNumber, normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

describe('Zambian phone normalization', () => {
  it('converts 097 local format to +260', () => {
    expect(normalizeZmPhoneNumber('0977123456')).toBe('+260977123456')
  })

  it('keeps +260 prefix', () => {
    expect(normalizeZmPhoneNumber('+260961234567')).toBe('+260961234567')
  })

  it('deduplicates batch input', () => {
    const nums = normalizePhoneNumbers(['0977123456', '0977123456', '+260977123456'])
    expect(nums).toEqual(['+260977123456'])
  })
})
