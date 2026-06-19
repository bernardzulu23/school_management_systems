import { describe, it, expect } from 'vitest'
import {
  calculateLeaveDays,
  leaveBalancesForTeacher,
  ANNUAL_LEAVE_DAYS,
  SICK_LEAVE_DAYS,
} from '@/lib/government/leave'

describe('government leave', () => {
  it('calculateLeaveDays is inclusive of start and end', () => {
    expect(calculateLeaveDays('2026-01-01', '2026-01-01')).toBe(1)
    expect(calculateLeaveDays('2026-01-01', '2026-01-05')).toBe(5)
    expect(calculateLeaveDays('2026-01-05', '2026-01-01')).toBe(0)
  })

  it('leaveBalancesForTeacher sums pending and approved days', () => {
    const leaves = [
      { leaveType: 'annual', status: 'approved', daysCount: 5 },
      { leaveType: 'annual', status: 'pending', daysCount: 3 },
      { leaveType: 'annual', status: 'rejected', daysCount: 10 },
      { leaveType: 'sick', status: 'approved', daysCount: 2 },
    ]
    const annual = leaveBalancesForTeacher(leaves, 'annual')
    expect(annual.used).toBe(8)
    expect(annual.remaining).toBe(ANNUAL_LEAVE_DAYS - 8)
    expect(annual.cap).toBe(ANNUAL_LEAVE_DAYS)

    const sick = leaveBalancesForTeacher(leaves, 'sick')
    expect(sick.used).toBe(2)
    expect(sick.remaining).toBe(SICK_LEAVE_DAYS - 2)
  })
})
