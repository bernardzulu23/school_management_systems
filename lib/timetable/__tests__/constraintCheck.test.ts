import { describe, expect, it } from 'vitest'
import {
  filterConflictFreeSchedulerEntries,
  isConflict,
  assignmentsShareSlot,
} from '../constraintCheck'
import type { Assignment } from '../types'

function baseAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    season: 'normal',
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '08:40',
    period: 1,
    teacherId: 't1',
    classId: 'c1',
    subjectId: 's1',
    ...overrides,
  }
}

describe('isConflict', () => {
  it('detects same teacher on same day and period', () => {
    const incoming = baseAssignment({ id: 'a2', classId: 'c2', subjectId: 's2' })
    const existing = [baseAssignment()]
    expect(isConflict(incoming, existing)).toBe(true)
  })

  it('detects same class on same day and period', () => {
    const incoming = baseAssignment({ id: 'a2', teacherId: 't2', subjectId: 's2' })
    const existing = [baseAssignment()]
    expect(isConflict(incoming, existing)).toBe(true)
  })

  it('allows different teacher and class on same slot', () => {
    const incoming = baseAssignment({ id: 'a2', teacherId: 't2', classId: 'c2' })
    const existing = [baseAssignment()]
    expect(isConflict(incoming, existing)).toBe(false)
  })

  it('detects conflict when period matches but start times differ', () => {
    const incoming = baseAssignment({
      id: 'a2',
      teacherId: 't1',
      classId: 'c2',
      startTime: '08:05',
      endTime: '08:45',
    })
    const existing = [baseAssignment({ startTime: '08:00', endTime: '08:40' })]
    expect(isConflict(incoming, existing)).toBe(true)
  })

  it('ignores different days', () => {
    const incoming = baseAssignment({ id: 'a2', dayOfWeek: 'Tuesday' })
    const existing = [baseAssignment()]
    expect(isConflict(incoming, existing)).toBe(false)
  })
})

describe('assignmentsShareSlot', () => {
  it('matches double-period overlap on consecutive periods', () => {
    const a = baseAssignment({ period: 1, consecutivePeriods: 2 })
    const b = baseAssignment({ id: 'a2', period: 2, teacherId: 't2', classId: 'c2' })
    expect(assignmentsShareSlot(a, b)).toBe(true)
  })
})

describe('filterConflictFreeSchedulerEntries', () => {
  it('keeps first row and drops duplicate teacher slot', () => {
    const entries = [
      {
        allocationId: 'al1',
        teacherId: 't1',
        classId: 'c1',
        subjectId: 's1',
        dayOfWeek: 'Thursday',
        startTime: '08:00',
        endTime: '08:40',
        periodNumber: 1,
        periodType: 'SINGLE',
      },
      {
        allocationId: 'al2',
        teacherId: 't1',
        classId: 'c2',
        subjectId: 's2',
        dayOfWeek: 'Thursday',
        startTime: '08:00',
        endTime: '08:40',
        periodNumber: 1,
        periodType: 'SINGLE',
      },
    ]

    const kept = filterConflictFreeSchedulerEntries(entries)
    expect(kept).toHaveLength(1)
    expect(kept[0].allocationId).toBe('al1')
  })
})
