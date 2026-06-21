import { describe, it, expect } from 'vitest'
import { interleaveLessons } from '@/lib/timetable/lessonOrdering'

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
