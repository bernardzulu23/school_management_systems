import { describe, expect, it } from 'vitest'
import {
  canUseSeniorTeacherFeatures,
  isPrimaryClassRecord,
} from '@/lib/senior-teacher/seniorTeacherAccess'

describe('seniorTeacherAccess', () => {
  it('allows primary and combined schools', () => {
    expect(canUseSeniorTeacherFeatures('primary')).toBe(true)
    expect(canUseSeniorTeacherFeatures('combined')).toBe(true)
    expect(canUseSeniorTeacherFeatures('secondary')).toBe(false)
  })

  it('detects primary classes from year group or class name', () => {
    expect(isPrimaryClassRecord({ year_group: 'Grade 5', name: '5A' })).toBe(true)
    expect(isPrimaryClassRecord({ year_group: 'Form 2', name: 'Form 2A' })).toBe(false)
    expect(isPrimaryClassRecord({ name: 'ECE B' })).toBe(true)
  })
})
