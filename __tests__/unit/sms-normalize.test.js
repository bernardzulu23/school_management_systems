import { describe, it, expect } from 'vitest'
import { normalizeZmPhoneNumber, normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

describe('Zambian phone normalization', () => {
  it('converts 097 local format to +260', () => {
    expect(normalizeZmPhoneNumber('0977123456')).toBe('+260977123456')
  })

  it('converts 0977934996 to +260977934996', () => {
    expect(normalizeZmPhoneNumber('0977934996')).toBe('+260977934996')
  })

  it('fixes mistaken +26 country code', () => {
    expect(normalizeZmPhoneNumber('+26977934996')).toBe('+260977934996')
  })

  it('keeps +260 prefix', () => {
    expect(normalizeZmPhoneNumber('+260961234567')).toBe('+260961234567')
  })

  it('deduplicates batch input', () => {
    const nums = normalizePhoneNumbers(['0977123456', '0977123456', '+260977123456'])
    expect(nums).toEqual(['+260977123456'])
  })
})
