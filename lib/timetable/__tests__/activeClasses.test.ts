import { describe, expect, it } from 'vitest'
import {
  collectAllocationClassNames,
  dedupeClassesByLabel,
  filterClassesForTimetablePicker,
  filterClassesInUse,
  normalizeClassLabel,
} from '../activeClasses'

describe('normalizeClassLabel', () => {
  it('treats 10A and Grade 10A as the same key', () => {
    expect(normalizeClassLabel('10A')).toBe('grade-10-a')
    expect(normalizeClassLabel('Grade 10A')).toBe('grade-10-a')
  })
})

describe('dedupeClassesByLabel', () => {
  it('keeps the class with more assignments when labels collide', () => {
    const out = dedupeClassesByLabel([
      { id: 'c1', name: '10A', assignmentCount: 2 },
      { id: 'c2', name: 'Grade 10A', assignmentCount: 8 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('c2')
  })
})

describe('filterClassesForTimetablePicker', () => {
  it('only returns classes with assignments and dedupes labels', () => {
    const out = filterClassesForTimetablePicker(
      [
        { id: 'c1', name: '10A' },
        { id: 'c2', name: 'Grade 10A' },
        { id: 'c3', name: '10B', isActive: false },
        { id: 'c4', name: 'Form 1B' },
      ],
      [
        { id: 'a1', classId: 'c1' } as any,
        { id: 'a2', classId: 'c2' } as any,
        { id: 'a3', classId: 'c2' } as any,
      ]
    )
    expect(out.map((c) => c.name)).toEqual(['Grade 10A'])
    expect(out[0].assignmentCount).toBe(3)
  })
})

describe('filterClassesInUse', () => {
  const classes = [
    { id: 'c1', name: '10A', students: 0 },
    { id: 'c2', name: '10B', students: 0 },
    { id: 'c3', name: 'Form 1B', students: 32 },
    { id: 'c4', name: 'Form 1C', students: 0 },
  ]

  it('keeps classes with timetable assignments and enrolled classes', () => {
    const out = filterClassesInUse(classes, {
      assignments: [{ classId: 'c1', id: 'a1' } as any],
    })
    expect(out.map((c) => c.name).sort()).toEqual(['10A', 'Form 1B'])
  })

  it('keeps classes with students when no assignments', () => {
    const out = filterClassesInUse(classes, { assignments: [] })
    expect(out.map((c) => c.name)).toEqual(['Form 1B'])
  })

  it('keeps allocation class names', () => {
    const out = filterClassesInUse(classes, {
      assignments: [],
      allocationClassNames: ['10A', 'Form 1B'],
    })
    expect(out.map((c) => c.name).sort()).toEqual(['10A', 'Form 1B'])
  })

  it('excludes inactive classes', () => {
    const out = filterClassesInUse([{ id: 'c1', name: '10A', isActive: false, students: 40 }], {
      assignments: [{ classId: 'c1' } as any],
    })
    expect(out).toHaveLength(0)
  })
})

describe('collectAllocationClassNames', () => {
  it('reads classes from allocation rows', () => {
    expect(
      collectAllocationClassNames([
        { allocationData: { classes: ['10A', 'Form 2A'] } },
        { allocationData: { classes: 'Form 1B' } },
      ])
    ).toEqual(['10A', 'Form 2A', 'Form 1B'])
  })
})
