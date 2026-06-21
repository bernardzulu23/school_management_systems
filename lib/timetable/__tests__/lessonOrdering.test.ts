import { describe, it, expect } from 'vitest'
import { interleaveLessons, compareDaySpread } from '@/lib/timetable/lessonOrdering'

describe('interleaveLessons', () => {
  it('round-robins teachers within each block size group', () => {
    const lessons = [
      { id: '1', teacherId: 't1', classId: 'c1', subjectId: 's1', consecutivePeriods: 2 },
      { id: '2', teacherId: 't1', classId: 'c2', subjectId: 's1', consecutivePeriods: 2 },
      { id: '3', teacherId: 't2', classId: 'c3', subjectId: 's1', consecutivePeriods: 2 },
      { id: '4', teacherId: 't2', classId: 'c4', subjectId: 's1', consecutivePeriods: 2 },
    ]

    const ordered = interleaveLessons(lessons)
    expect(ordered.map((l) => l.id)).toEqual(['1', '3', '2', '4'])
  })
})

describe('compareDaySpread', () => {
  const base = {
    teacherId: 't1',
    classId: 'c1',
    subjectId: 's1',
    teacherDayLoad: new Map<string, number>(),
    classSubjectDayLoad: new Map<string, number>(),
  }

  it('prefers days with no class-subject load first', () => {
    const classSubjectDayLoad = new Map([['c1|s1|monday', 1]])
    expect(
      compareDaySpread({
        ...base,
        dayA: 'tuesday',
        dayB: 'monday',
        classSubjectDayLoad,
      })
    ).toBeLessThan(0)
  })

  it('prefers empty teacher days when class-subject load is equal', () => {
    const teacherDayLoad = new Map([
      ['t1|monday', 0],
      ['t1|tuesday', 2],
    ])
    expect(
      compareDaySpread({
        ...base,
        dayA: 'monday',
        dayB: 'tuesday',
        teacherDayLoad,
      })
    ).toBeLessThan(0)
  })

  it('applies multi-block penalty when both days already have teacher load', () => {
    const teacherDayLoad = new Map([
      ['t1|monday', 1],
      ['t1|tuesday', 1],
    ])
    const penalty = (tid: string, day: string) => (day === 'tuesday' ? 5 : 0)
    expect(
      compareDaySpread({
        ...base,
        dayA: 'monday',
        dayB: 'tuesday',
        teacherDayLoad,
        teacherMultiPenalty: penalty,
      })
    ).toBeLessThan(0)
  })
})
