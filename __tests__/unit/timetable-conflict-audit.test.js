import { describe, it, expect } from 'vitest'
import { validateTimetable } from '@/lib/timetable/validateTimetable'
import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'

describe('timetable conflict audit helpers', () => {
  it('detects teacher double-booking from overlapping assignments', () => {
    const entries = [
      {
        id: 'e1',
        teacherId: 't1',
        classId: 'c1',
        subjectId: 's1',
        dayOfWeek: 'Monday',
        startTime: '08:00',
        endTime: '08:40',
        periodNumber: 1,
        allocation: {
          teacher: { id: 't1', name: 'Mr. Banda' },
          class: { id: 'c1', name: '10A' },
          subject: { id: 's1', name: 'Math' },
        },
      },
      {
        id: 'e2',
        teacherId: 't1',
        classId: 'c2',
        subjectId: 's2',
        dayOfWeek: 'Monday',
        startTime: '08:00',
        endTime: '08:40',
        periodNumber: 1,
        allocation: {
          teacher: { id: 't1', name: 'Mr. Banda' },
          class: { id: 'c2', name: '11B' },
          subject: { id: 's2', name: 'Physics' },
        },
      },
    ]

    const assignments = mapDbEntriesToAssignments(entries)
    const conflicts = validateTimetable(assignments)
    const hard = conflicts.filter((c) => c.severity === 'hard')

    expect(hard.some((c) => c.type === 'TEACHER_DOUBLE_BOOKED')).toBe(true)
    expect(hard.length).toBeGreaterThanOrEqual(1)
  })

  it('detects class double-booking from overlapping assignments', () => {
    const entries = [
      {
        id: 'e1',
        teacherId: 't1',
        classId: 'c1',
        subjectId: 's1',
        dayOfWeek: 'Tuesday',
        startTime: '09:00',
        endTime: '09:40',
        periodNumber: 2,
        allocation: {
          teacher: { id: 't1', name: 'Teacher A' },
          class: { id: 'c1', name: 'Form 2A' },
          subject: { id: 's1', name: 'Biology' },
        },
      },
      {
        id: 'e2',
        teacherId: 't2',
        classId: 'c1',
        subjectId: 's2',
        dayOfWeek: 'Tuesday',
        startTime: '09:00',
        endTime: '09:40',
        periodNumber: 2,
        allocation: {
          teacher: { id: 't2', name: 'Teacher B' },
          class: { id: 'c1', name: 'Form 2A' },
          subject: { id: 's2', name: 'Chemistry' },
        },
      },
    ]

    const assignments = mapDbEntriesToAssignments(entries)
    const conflicts = validateTimetable(assignments)

    expect(conflicts.some((c) => c.type === 'CLASS_DOUBLE_BOOKED')).toBe(true)
  })
})
