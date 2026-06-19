import { describe, it, expect } from 'vitest'
import {
  calculateGpi,
  gpiStatus,
  normalizeStudentGender,
  buildEnrolmentByYearGroup,
  buildAttendanceComparison,
  isPresentStatus,
} from '@/lib/government/genderReport'

describe('government gender report', () => {
  it('calculateGpi returns female/male ratio', () => {
    expect(calculateGpi(100, 97)).toBe(0.97)
    expect(calculateGpi(0, 50)).toBe(null)
    expect(calculateGpi(0, 0)).toBe(1)
  })

  it('gpiStatus buckets parity thresholds', () => {
    expect(gpiStatus(0.98)).toBe('good')
    expect(gpiStatus(0.95)).toBe('warn')
    expect(gpiStatus(0.85)).toBe('poor')
    expect(gpiStatus(null)).toBe('unknown')
  })

  it('normalizeStudentGender handles common values', () => {
    expect(normalizeStudentGender('male')).toBe('Male')
    expect(normalizeStudentGender('F')).toBe('Female')
    expect(normalizeStudentGender('')).toBe('Unknown')
  })

  it('buildEnrolmentByYearGroup aggregates by year group', () => {
    const rows = buildEnrolmentByYearGroup([
      { classRef: { year_group: 'G5' }, user: { gender: 'male' } },
      { classRef: { year_group: 'G5' }, user: { gender: 'female' } },
      { class: 'G6', user: { gender: 'M' } },
    ])
    expect(rows).toHaveLength(2)
    const g5 = rows.find((r) => r.yearGroup === 'G5')
    expect(g5.male).toBe(1)
    expect(g5.female).toBe(1)
    expect(g5.total).toBe(2)
  })

  it('buildAttendanceComparison buckets present/late vs absent', () => {
    expect(isPresentStatus('PRESENT')).toBe(true)
    expect(isPresentStatus('LATE')).toBe(true)
    expect(isPresentStatus('ABSENT')).toBe(false)

    const stats = buildAttendanceComparison([
      { status: 'PRESENT', student: { user: { gender: 'male' } } },
      { status: 'ABSENT', student: { user: { gender: 'male' } } },
      { status: 'LATE', student: { user: { gender: 'female' } } },
    ])
    expect(stats.maleRate).toBe(50)
    expect(stats.femaleRate).toBe(100)
  })
})
