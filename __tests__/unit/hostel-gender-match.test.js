import { describe, it, expect } from 'vitest'
import {
  normalizeRoomGender,
  checkHostelGenderMatch,
  assertHostelGenderMatch,
} from '@/lib/hostel/genderMatch'

describe('hostel genderMatch', () => {
  it('normalizeRoomGender maps room values', () => {
    expect(normalizeRoomGender('Male')).toBe('male')
    expect(normalizeRoomGender('female')).toBe('female')
    expect(normalizeRoomGender('mixed')).toBe('mixed')
    expect(normalizeRoomGender('')).toBe('mixed')
  })

  it('allows male student in male room', () => {
    expect(checkHostelGenderMatch({ studentGender: 'male', roomGender: 'male' }).ok).toBe(true)
  })

  it('rejects female student in male room', () => {
    const r = checkHostelGenderMatch({ studentGender: 'female', roomGender: 'male' })
    expect(r.ok).toBe(false)
    expect(r.code).toBe('HOSTEL_GENDER_MISMATCH')
  })

  it('rejects male student in female room', () => {
    const r = checkHostelGenderMatch({ studentGender: 'M', roomGender: 'female' })
    expect(r.ok).toBe(false)
    expect(r.code).toBe('HOSTEL_GENDER_MISMATCH')
  })

  it('allows any gender in mixed room', () => {
    expect(checkHostelGenderMatch({ studentGender: 'female', roomGender: 'mixed' }).ok).toBe(true)
    expect(checkHostelGenderMatch({ studentGender: 'male', roomGender: 'mixed' }).ok).toBe(true)
  })

  it('rejects unknown gender for gender-specific room', () => {
    const r = checkHostelGenderMatch({ studentGender: '', roomGender: 'male' })
    expect(r.ok).toBe(false)
    expect(r.code).toBe('HOSTEL_GENDER_UNKNOWN')
  })

  it('assertHostelGenderMatch throws with code', () => {
    expect(() => assertHostelGenderMatch({ studentGender: 'female', roomGender: 'male' })).toThrow(
      /male boarders only/
    )
    try {
      assertHostelGenderMatch({ studentGender: 'female', roomGender: 'male' })
    } catch (e) {
      expect(e.code).toBe('HOSTEL_GENDER_MISMATCH')
    }
  })
})
