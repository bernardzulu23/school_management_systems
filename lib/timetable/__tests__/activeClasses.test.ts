import { describe, expect, it } from 'vitest'
import { collectAllocationClassNames, filterClassesInUse } from '../activeClasses'

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
