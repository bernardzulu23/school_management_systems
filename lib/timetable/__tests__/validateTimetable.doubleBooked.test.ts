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
