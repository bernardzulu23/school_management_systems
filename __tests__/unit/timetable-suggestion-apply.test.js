import { describe, it, expect } from 'vitest'
import { mergeAssignmentMove } from '@/lib/timetable/suggestionApply'

describe('suggestionApply', () => {
  it('merges a move onto the latest assignment list', () => {
    const a1 = {
      id: 'a1',
      classId: 'c1',
      teacherId: 't1',
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '07:40',
      period: 1,
      season: 'normal',
      isBreak: false,
    }
    const a2 = { ...a1, id: 'a2', classId: 'c2' }
    const moved = { ...a1, dayOfWeek: 'wednesday', period: 5, startTime: '10:00', endTime: '10:40' }

    const snapshot = [a1, a2]
    const stalePreview = [moved, a2]
    const apply = mergeAssignmentMove(snapshot, 'a1', moved)

    const current = [
      { ...a1, teacherId: 't9' },
      { ...a2, dayOfWeek: 'tuesday' },
    ]
    const result = apply(current)

    expect(result[0].dayOfWeek).toBe('wednesday')
    expect(result[0].teacherId).toBe('t9')
    expect(result[1].dayOfWeek).toBe('tuesday')
    expect(stalePreview).toHaveLength(2)
  })
})
