import { describe, it, expect } from 'vitest'
import {
  getDistrictsForProvince,
  isValidDistrictForProvince,
  normalizeDistrict,
} from '@/lib/platform/zambiaDistricts'

describe('zambiaDistricts', () => {
  it('returns districts for Lusaka', () => {
    const list = getDistrictsForProvince('Lusaka')
    expect(list).toContain('Lusaka')
    expect(list).toContain('Kafue')
  })

  it('validates district belongs to province list', () => {
    expect(isValidDistrictForProvince('Eastern', 'Chipata')).toBe(true)
    expect(isValidDistrictForProvince('Eastern', 'Ndola')).toBe(false)
  })

  it('normalizes district casing', () => {
    expect(normalizeDistrict('chipata', 'Eastern')).toBe('Chipata')
  })
})
