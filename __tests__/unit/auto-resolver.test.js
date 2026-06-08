import { describe, it, expect } from 'vitest'
import { autoResolveConflicts } from '@/lib/timetable/autoResolver'

const timeSlots = [
  {
    dayOfWeek: 'monday',
    startTime: '07:00',
    endTime: '07:40',
    period: 1,
    isBreak: false,
  },
  {
    dayOfWeek: 'monday',
    startTime: '07:40',
    endTime: '08:20',
    period: 2,
    isBreak: false,
  },
  {
    dayOfWeek: 'tuesday',
    startTime: '07:00',
    endTime: '07:40',
    period: 1,
    isBreak: false,
  },
]

function lesson(id, overrides) {
  return {
    id,
    season: 'normal',
    dayOfWeek: 'monday',
    startTime: '07:00',
    endTime: '07:40',
    period: 1,
    isBreak: false,
    ...overrides,
  }
}

describe('autoResolveConflicts', () => {
  it('moves a stacked grade lesson to a free slot', () => {
    const assignments = [
      lesson('a1', { teacherId: 't1', classId: 'g1', subjectId: 'math' }),
      lesson('a2', { teacherId: 't2', classId: 'g1', subjectId: 'english' }),
    ]

    const result = autoResolveConflicts({ assignments, timeSlots })

    expect(result.resolvedCount).toBeGreaterThan(0)
    expect(result.remainingConflicts).toBe(0)

    const mondayG1 = result.assignments.filter(
      (a) => a.classId === 'g1' && a.dayOfWeek === 'monday' && a.startTime === '07:00'
    )
    expect(mondayG1.length).toBeLessThanOrEqual(1)
  })

  it('resolves teacher double-booking by moving one lesson', () => {
    const assignments = [
      lesson('a1', { teacherId: 't1', classId: 'g1', subjectId: 'math' }),
      lesson('a2', { teacherId: 't1', classId: 'g2', subjectId: 'math' }),
    ]

    const result = autoResolveConflicts({ assignments, timeSlots })

    expect(result.resolvedCount).toBeGreaterThan(0)
    expect(result.remainingConflicts).toBe(0)
  })
})
