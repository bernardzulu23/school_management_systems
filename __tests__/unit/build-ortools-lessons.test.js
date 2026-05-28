import { describe, it, expect } from 'vitest'
import { buildOrtoolsLessons } from '@/lib/timetable/buildSchoolSolverPayload'

describe('buildOrtoolsLessons', () => {
  it('uses teacher allocations when present', () => {
    const payload = {
      teacherAllocations: [
        {
          id: 'a1',
          teacherId: 't1',
          classId: 'c1',
          subjectId: 's1',
          periodsPerWeek: 5,
        },
      ],
    }
    const lessons = buildOrtoolsLessons(payload, [])
    expect(lessons).toHaveLength(1)
    expect(lessons[0].periodsPerWeek).toBe(5)
  })

  it('groups effective lessons by teacher/class/subject', () => {
    const payload = { teacherAllocations: [] }
    const effective = [
      { id: 'u1', teacherId: 't1', classId: 'c1', subjectId: 's1', consecutivePeriods: 2 },
      { id: 'u2', teacherId: 't1', classId: 'c1', subjectId: 's1', consecutivePeriods: 1 },
    ]
    const lessons = buildOrtoolsLessons(payload, effective)
    expect(lessons).toHaveLength(1)
    expect(lessons[0].periodsPerWeek).toBe(3)
  })
})
