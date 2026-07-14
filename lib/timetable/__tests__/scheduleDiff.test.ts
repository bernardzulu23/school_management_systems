import { describe, expect, it } from 'vitest'
import { diffAffectedTeacherIds, entryScheduleFingerprint } from '@/lib/timetable/scheduleDiff'

function slot(overrides = {}) {
  return {
    teacherId: 't1',
    classId: 'c1',
    subjectId: 'sub1',
    dayOfWeek: 'Monday',
    periodNumber: 1,
    startTime: '08:00',
    endTime: '08:40',
    classroomId: null,
    ...overrides,
  }
}

describe('scheduleDiff', () => {
  it('fingerprints ignore entry identity', () => {
    expect(entryScheduleFingerprint(slot({ id: 'a' }))).toBe(
      entryScheduleFingerprint(slot({ id: 'b' }))
    )
  })

  it('skips teachers with identical period sets on republish', () => {
    const before = [slot(), slot({ teacherId: 't2', dayOfWeek: 'Tuesday' })]
    const after = [slot(), slot({ teacherId: 't2', dayOfWeek: 'Tuesday' })]
    const diff = diffAffectedTeacherIds(before, after)
    expect(diff.affectedTeacherIds).toEqual([])
    expect(diff.unchangedCount).toBe(2)
  })

  it('notifies only teachers whose slots changed', () => {
    const before = [
      slot(),
      slot({ teacherId: 't2', dayOfWeek: 'Tuesday' }),
      slot({ teacherId: 't3', dayOfWeek: 'Wednesday' }),
    ]
    const after = [
      slot({ startTime: '09:00', endTime: '09:40', periodNumber: 2 }),
      slot({ teacherId: 't2', dayOfWeek: 'Tuesday' }),
      slot({ teacherId: 't4', dayOfWeek: 'Thursday' }),
    ]
    const diff = diffAffectedTeacherIds(before, after)
    expect(diff.affectedTeacherIds.sort()).toEqual(['t1', 't3', 't4'])
    expect(diff.unchangedCount).toBe(1)
  })

  it('first publish treats every scheduled teacher as affected', () => {
    const after = [slot(), slot({ teacherId: 't2' })]
    const diff = diffAffectedTeacherIds([], after)
    expect(diff.affectedTeacherIds.sort()).toEqual(['t1', 't2'])
  })
})
