import { describe, expect, it } from 'vitest'
import {
  activeClassIdsFromAssignments,
  conflictReferencesInactiveClass,
  filterConflictsForActiveClasses,
  filterConflictMapForActiveClasses,
} from '@/lib/timetable/filterActiveClassConflicts'
import type { Assignment, Conflict } from '@/lib/timetable/types'

describe('cleanupConflicts', () => {
  const assignments: Assignment[] = [
    {
      id: 'a1',
      classId: 'c1',
      teacherId: 't1',
      subjectId: 's1',
      dayOfWeek: 'monday',
      startTime: '08:00',
      endTime: '08:40',
      period: 1,
    } as Assignment,
  ]

  it('drops conflicts for classes with no assignments', () => {
    const stale: Conflict = {
      type: 'ClassDoubleBooked',
      severity: 'critical',
      message: 'Grade 10A is double-booked',
      related: { classIds: ['empty-class'], assignmentIds: [] },
    }
    const real: Conflict = {
      type: 'ClassDoubleBooked',
      severity: 'critical',
      message: '1A is double-booked',
      related: { classIds: ['c1'], assignmentIds: ['a1'] },
    }
    const out = filterConflictsForActiveClasses([stale, real], assignments)
    expect(out).toHaveLength(1)
    expect(out[0].related?.classIds).toEqual(['c1'])
  })

  it('filters conflict map keys with only stale rows', () => {
    const map = new Map<string, Conflict[]>([
      [
        'ghost',
        [
          {
            type: 'ClassDoubleBooked',
            severity: 'high',
            message: 'x',
            related: { classIds: ['ghost-class'] },
          },
        ],
      ],
      [
        'a1',
        [
          {
            type: 'TeacherDoubleBooked',
            severity: 'high',
            message: 'y',
            related: { assignmentIds: ['a1'], classIds: ['c1'] },
          },
        ],
      ],
    ])
    const next = filterConflictMapForActiveClasses(map, assignments)
    expect(next.size).toBe(1)
    expect(next.has('a1')).toBe(true)
  })

  it('activeClassIdsFromAssignments collects ids', () => {
    expect(activeClassIdsFromAssignments(assignments)).toEqual(new Set(['c1']))
  })

  it('conflictReferencesInactiveClass detects empty class refs', () => {
    const active = activeClassIdsFromAssignments(assignments)
    const byId = new Map(assignments.map((a) => [String(a.id), a]))
    expect(
      conflictReferencesInactiveClass(
        { type: 'X', severity: 'low', message: 'm', related: { classIds: ['empty'] } },
        active,
        byId
      )
    ).toBe(true)
  })
})
