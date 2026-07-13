import { describe, it, expect } from 'vitest'
import {
  expandAllocationToUnitsForAllClasses,
  normalizeAllocationPeriods,
} from '@/lib/timetable/periodExpansion'

describe('expandAllocationToUnitsForAllClasses', () => {
  it('expands one block set per class UUID on a combined row', () => {
    const classA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const classB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const classC = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

    const units = expandAllocationToUnitsForAllClasses({
      id: 'alloc-1',
      teacherId: 'teacher-1',
      classId: classA,
      subjectId: 'pe',
      classes: [classA, classB, classC],
      singlePeriods: 1,
      doublePeriods: 2,
      triplePeriods: 1,
      periodsPerWeek: 8,
      blockType: 'MIXED',
    })

    expect(units).toHaveLength(12)
    expect(units.filter((u) => u.classId === classA)).toHaveLength(4)
    expect(units.filter((u) => u.classId === classB)).toHaveLength(4)
    expect(units.filter((u) => u.classId === classC)).toHaveLength(4)
    expect(
      normalizeAllocationPeriods({ singlePeriods: 1, doublePeriods: 2, triplePeriods: 1 })
        .totalPeriods
    ).toBe(8)
  })

  it('does not fan out grade labels on a single-class row', () => {
    const units = expandAllocationToUnitsForAllClasses({
      id: 'alloc-2',
      teacherId: 'teacher-1',
      classId: 'class-uuid-1',
      subjectId: 'pe',
      classes: ['10A', 'Form 1A', 'Form 2A'],
      doublePeriods: 3,
      periodsPerWeek: 6,
      blockType: 'DOUBLE',
    })

    expect(units).toHaveLength(3)
    expect(units.every((u) => u.classId === 'class-uuid-1')).toBe(true)
  })

  it('repairs legacy p4 blocks that summed to 5 against periodsPerWeek 4', () => {
    const repaired = normalizeAllocationPeriods({
      singlePeriods: 1,
      doublePeriods: 2,
      triplePeriods: 0,
      periodsPerWeek: 4,
      blockType: 'MIXED',
    })
    expect(repaired).toEqual({ singles: 0, doubles: 2, triples: 0, totalPeriods: 4 })
  })
})
