import { describe, it, expect } from 'vitest'
import {
  dedupeAssignmentsByClassSlot,
  findDuplicateSlots,
} from '@/lib/timetable/assignmentInvariants'

describe('assignmentInvariants', () => {
  const base = {
    teacherId: 't1',
    subjectId: 's1',
    classroomId: 'r1',
    dayOfWeek: 'monday',
    startTime: '07:00',
    endTime: '08:20',
    period: 1,
    season: 'normal',
    isBreak: false,
  }

  it('findDuplicateSlots detects same class in overlapping slot', () => {
    const rows = [
      { ...base, id: 'a1', classId: 'c1' },
      { ...base, id: 'a2', classId: 'c1', subjectId: 's2', teacherId: 't2' },
      { ...base, id: 'a3', classId: 'c2' },
    ]
    const dupes = findDuplicateSlots(rows)
    expect(dupes.length).toBe(1)
    expect(dupes[0].classId).toBe('c1')
    expect(dupes[0].assignmentIds).toEqual(expect.arrayContaining(['a1', 'a2']))
  })

  it('dedupeAssignmentsByClassSlot keeps one row per class slot', () => {
    const rows = [
      { ...base, id: 'a1', classId: 'c1' },
      { ...base, id: 'a2', classId: 'c1', subjectId: 's2' },
      { ...base, id: 'a3', classId: 'c1', subjectId: 's3' },
    ]
    const out = dedupeAssignmentsByClassSlot(rows)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('a1')
  })
})
