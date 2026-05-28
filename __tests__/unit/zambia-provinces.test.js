import { describe, it, expect } from 'vitest'
import {
  ZAMBIA_PROVINCES,
  isValidZambiaProvince,
  normalizeZambiaProvince,
} from '@/lib/platform/zambiaProvinces'

describe('ZAMBIA_PROVINCES', () => {
  it('has exactly 10 provinces', () => {
    expect(ZAMBIA_PROVINCES).toHaveLength(10)
  })

  it('includes Lusaka and Copperbelt', () => {
    expect(ZAMBIA_PROVINCES).toContain('Lusaka')
    expect(ZAMBIA_PROVINCES).toContain('Copperbelt')
  })

  it('validates and normalizes province names', () => {
    expect(isValidZambiaProvince('lusaka')).toBe(true)
    expect(normalizeZambiaProvince('lusaka')).toBe('Lusaka')
    expect(isValidZambiaProvince('')).toBe(true)
    expect(isValidZambiaProvince('Mars')).toBe(false)
  })
})
