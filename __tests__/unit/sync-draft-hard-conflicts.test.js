import { describe, it, expect } from 'vitest'
import { getHardConflictsForDraftEntries } from '@/lib/timetable/draftHardConflictCheck'

describe('getHardConflictsForDraftEntries', () => {
  it('returns no conflicts for non-overlapping teacher assignments', () => {
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
      },
      {
        id: 'e2',
        teacherId: 't1',
        classId: 'c2',
        subjectId: 's2',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '09:40',
        periodNumber: 2,
      },
    ]
    expect(getHardConflictsForDraftEntries(entries)).toHaveLength(0)
  })

  it('detects teacher double-booking on sync-draft shaped rows', () => {
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
      },
    ]
    const hard = getHardConflictsForDraftEntries(entries)
    expect(hard.length).toBeGreaterThan(0)
    expect(hard.some((c) => c.type === 'TEACHER_DOUBLE_BOOKED')).toBe(true)
  })

  it('detects class double-booking', () => {
    const entries = [
      {
        id: 'e1',
        teacherId: 't1',
        classId: 'c1',
        subjectId: 's1',
        dayOfWeek: 'Tuesday',
        startTime: '10:00',
        endTime: '10:40',
        periodNumber: 3,
      },
      {
        id: 'e2',
        teacherId: 't2',
        classId: 'c1',
        subjectId: 's2',
        dayOfWeek: 'Tuesday',
        startTime: '10:00',
        endTime: '10:40',
        periodNumber: 3,
      },
    ]
    const hard = getHardConflictsForDraftEntries(entries)
    expect(hard.some((c) => c.type === 'CLASS_DOUBLE_BOOKED')).toBe(true)
  })
})
