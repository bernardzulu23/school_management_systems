import { describe, expect, it } from 'vitest'
import {
  validateTimetable,
  dedupeValidationConflicts,
  getHardConflicts,
} from '@/lib/timetable/validateTimetable'
import { planExactDuplicateDraftDeletes } from '@/lib/timetable/purgeExactDuplicateDraftEntries'

function lesson(partial) {
  return {
    id: partial.id,
    season: 'normal',
    dayOfWeek: partial.dayOfWeek || 'friday',
    startTime: partial.startTime || '07:30',
    endTime: partial.endTime || '08:10',
    period: partial.period || 1,
    teacherId: partial.teacherId || 't1',
    classId: partial.classId || 'c10a',
    subjectId: partial.subjectId || 'home',
    className: partial.className || '10A',
    subjectName: partial.subjectName || 'Home Management',
    teacherName: partial.teacherName || 'Teacher',
    classroomId: partial.classroomId,
    classroomName: partial.classroomName,
    isBreak: false,
  }
}

describe('validateTimetable CLASS_DOUBLE_BOOKED clustering', () => {
  it('reports one CLASS_DOUBLE_BOOKED for 3 identical class/subject/slot rows (not C(3,2)=3)', () => {
    const assignments = [lesson({ id: 'a' }), lesson({ id: 'b' }), lesson({ id: 'c' })]
    const hard = getHardConflicts(validateTimetable(assignments))
    const classConflicts = hard.filter((c) => c.type === 'CLASS_DOUBLE_BOOKED')
    expect(classConflicts).toHaveLength(1)
    expect(classConflicts[0].assignmentIds.sort()).toEqual(['a', 'b', 'c'])
  })

  it('reports one CLASS_DOUBLE_BOOKED when two different subjects share a slot', () => {
    const assignments = [
      lesson({ id: 'a', subjectId: 'math', subjectName: 'Math' }),
      lesson({ id: 'b', subjectId: 'eng', subjectName: 'English', teacherId: 't2' }),
    ]
    const hard = getHardConflicts(validateTimetable(assignments))
    const classConflicts = hard.filter((c) => c.type === 'CLASS_DOUBLE_BOOKED')
    expect(classConflicts).toHaveLength(1)
    expect(classConflicts[0].assignmentIds.sort()).toEqual(['a', 'b'])
  })

  it('does not emit pairwise duplicates after dedupeValidationConflicts', () => {
    const assignments = [lesson({ id: 'a' }), lesson({ id: 'b' }), lesson({ id: 'c' })]
    const deduped = dedupeValidationConflicts(validateTimetable(assignments))
    expect(deduped.filter((c) => c.type === 'CLASS_DOUBLE_BOOKED')).toHaveLength(1)
  })

  it('does not hard-flag same subject twice on one day when times do not overlap', () => {
    const assignments = [
      lesson({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 }),
      lesson({
        id: 'b',
        startTime: '10:00',
        endTime: '10:40',
        period: 5,
        teacherId: 't2',
      }),
    ]
    const result = validateTimetable(assignments)
    expect(getHardConflicts(result).filter((c) => c.type === 'CLASS_DOUBLE_BOOKED')).toHaveLength(0)
    const soft = result.filter((c) => c.type === 'SUBJECT_DISTRIBUTION')
    expect(soft).toHaveLength(1)
  })

  it('treats adjacent half-open ranges as non-overlapping (EXCLUDE semantics)', () => {
    const assignments = [
      lesson({ id: 'a', startTime: '07:30', endTime: '08:50', period: 1 }),
      lesson({
        id: 'b',
        startTime: '08:50',
        endTime: '09:30',
        period: 3,
        teacherId: 't2',
      }),
    ]
    expect(getHardConflicts(validateTimetable(assignments))).toHaveLength(0)
  })

  it('CLASS_DOUBLE_BOOKED message cites both time windows for same-subject overlap', () => {
    const assignments = [
      lesson({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 }),
      lesson({
        id: 'b',
        startTime: '07:20',
        endTime: '08:00',
        period: 1,
        teacherId: 't2',
      }),
    ]
    const hard = getHardConflicts(validateTimetable(assignments)).filter(
      (c) => c.type === 'CLASS_DOUBLE_BOOKED'
    )
    expect(hard).toHaveLength(1)
    expect(hard[0].message).toMatch(/07:00–07:40/)
    expect(hard[0].message).toMatch(/07:20–08:00/)
    expect(hard[0].message).toMatch(/Home Management/)
  })
})

describe('planExactDuplicateDraftDeletes', () => {
  it('keeps first and deletes exact copies', () => {
    const entries = [
      {
        id: '1',
        classId: 'c',
        subjectId: 's',
        teacherId: 't',
        dayOfWeek: 'friday',
        startTime: '07:30',
        endTime: '08:10',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        classId: 'c',
        subjectId: 's',
        teacherId: 't',
        dayOfWeek: 'friday',
        startTime: '07:30',
        endTime: '08:10',
        createdAt: '2026-01-02T00:00:00Z',
      },
      {
        id: '3',
        classId: 'c',
        subjectId: 's',
        teacherId: 't',
        dayOfWeek: 'friday',
        startTime: '07:30',
        endTime: '08:10',
        createdAt: '2026-01-03T00:00:00Z',
      },
    ]
    const { deletedIds, kept } = planExactDuplicateDraftDeletes(entries)
    expect(kept).toBe(1)
    expect(deletedIds.sort()).toEqual(['2', '3'])
  })

  it('does not delete different subjects in the same slot', () => {
    const entries = [
      {
        id: '1',
        classId: 'c',
        subjectId: 'math',
        teacherId: 't1',
        dayOfWeek: 'friday',
        startTime: '07:30',
        endTime: '08:10',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        classId: 'c',
        subjectId: 'eng',
        teacherId: 't2',
        dayOfWeek: 'friday',
        startTime: '07:30',
        endTime: '08:10',
        createdAt: '2026-01-02T00:00:00Z',
      },
    ]
    const { deletedIds } = planExactDuplicateDraftDeletes(entries)
    expect(deletedIds).toEqual([])
  })
})

describe('validateTimetable ROOM_DOUBLE_BOOKED', () => {
  it('flags two classes sharing a room at overlapping times', () => {
    const hard = getHardConflicts(
      validateTimetable([
        lesson({
          id: 'a',
          classId: 'c1',
          className: '10A',
          teacherId: 't1',
          classroomId: 'lab1',
          classroomName: 'Science Lab',
          startTime: '09:00',
          endTime: '09:40',
        }),
        lesson({
          id: 'b',
          classId: 'c2',
          className: '10B',
          teacherId: 't2',
          subjectId: 'chem',
          subjectName: 'Chemistry',
          classroomId: 'lab1',
          classroomName: 'Science Lab',
          startTime: '09:20',
          endTime: '10:00',
        }),
      ])
    )
    const room = hard.filter((c) => c.type === 'ROOM_DOUBLE_BOOKED')
    expect(room).toHaveLength(1)
    expect(room[0].entityId).toBe('lab1')
    expect(room[0].message).toMatch(/Science Lab/)
  })

  it('skips room checks when classroomId is unset', () => {
    const hard = getHardConflicts(
      validateTimetable([
        lesson({ id: 'a', classId: 'c1', teacherId: 't1', startTime: '09:00', endTime: '09:40' }),
        lesson({
          id: 'b',
          classId: 'c2',
          teacherId: 't2',
          startTime: '09:00',
          endTime: '09:40',
        }),
      ])
    )
    expect(hard.filter((c) => c.type === 'ROOM_DOUBLE_BOOKED')).toHaveLength(0)
  })
})
