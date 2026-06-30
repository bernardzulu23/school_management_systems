import { describe, it, expect } from 'vitest'
import { validateBundle, autoBundleSplit } from '@/lib/timetable/bundle-utils'
import {
  canPlace,
  consecutivePeriodsAreValid,
  deriveBreakAfterPeriods,
  generateTimetable,
  generateTimetableOnce,
  periodsOverlap,
  wouldStackSameDay,
  type PlacedBlock,
  type SchedulerBlock,
} from '@/lib/timetable/scheduler'

describe('validateBundle', () => {
  it('accepts bundles that sum to total periods', () => {
    expect(validateBundle({ doubles: 3, singles: 0, triples: 0 }, 6)).toBe(true)
    expect(validateBundle({ doubles: 2, singles: 1, triples: 0 }, 5)).toBe(true)
  })

  it('rejects mismatched bundles', () => {
    expect(validateBundle({ doubles: 2, singles: 0, triples: 0 }, 6)).toBe(false)
  })
})

describe('autoBundleSplit', () => {
  it('prefers doubles for 6 periods', () => {
    expect(autoBundleSplit(6)).toEqual({ doubles: 3, singles: 0, triples: 0 })
  })
})

describe('consecutivePeriodsAreValid', () => {
  it('blocks doubles crossing break after period 2', () => {
    expect(consecutivePeriodsAreValid(2, 2)).toBe(false)
  })

  it('allows double starting at period 3', () => {
    expect(consecutivePeriodsAreValid(3, 2)).toBe(true)
  })

  it('uses derived break positions from bell schedule', () => {
    const daySlots = {
      Monday: [
        {
          type: 'period' as const,
          periodNumber: 1,
          start: 0,
          end: 40,
          startTime: '07:00',
          endTime: '07:40',
          durationMin: 40,
          day: 'Monday',
        },
        {
          type: 'period' as const,
          periodNumber: 2,
          start: 40,
          end: 80,
          startTime: '07:40',
          endTime: '08:20',
          durationMin: 40,
          day: 'Monday',
        },
        {
          type: 'period' as const,
          periodNumber: 3,
          start: 80,
          end: 120,
          startTime: '08:20',
          endTime: '09:00',
          durationMin: 40,
          day: 'Monday',
        },
        {
          type: 'period' as const,
          periodNumber: 4,
          start: 120,
          end: 160,
          startTime: '09:00',
          endTime: '09:40',
          durationMin: 40,
          day: 'Monday',
        },
        {
          type: 'break' as const,
          periodNumber: 0,
          start: 160,
          end: 180,
          startTime: '09:40',
          endTime: '10:00',
          durationMin: 20,
          day: 'Monday',
        },
        {
          type: 'period' as const,
          periodNumber: 5,
          start: 180,
          end: 220,
          startTime: '10:00',
          endTime: '10:40',
          durationMin: 40,
          day: 'Monday',
        },
      ],
    }
    const breaks = deriveBreakAfterPeriods(daySlots)
    expect(breaks).toEqual([4])
    expect(consecutivePeriodsAreValid(2, 2, breaks)).toBe(true)
    expect(consecutivePeriodsAreValid(4, 2, breaks)).toBe(false)
  })
})

describe('canPlace', () => {
  const block: SchedulerBlock = {
    blockId: 'b1',
    allocationId: 'a1',
    teacherId: 't1',
    classId: 'c1',
    subjectId: 's1',
    span: 1,
    unitType: 'SINGLE',
  }

  it('detects teacher conflict on overlapping period', () => {
    const placed: PlacedBlock[] = [
      {
        ...block,
        blockId: 'existing',
        classId: 'c2',
        subjectId: 's2',
        day: 'monday',
        startPeriod: 1,
        startMin: 0,
        endMin: 40,
        startTime: '07:00',
        endTime: '07:40',
      },
    ]
    const result = canPlace(block, { day: 'monday', startPeriod: 1, span: 1 }, placed)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('teacher_conflict')
  })

  it('detects forbidden recipe slots', () => {
    const result = canPlace(block, { day: 'monday', startPeriod: 1, span: 1 }, [], {
      placementRule: {
        forbiddenDays: new Set(['monday']),
        forbiddenPeriods: new Set(),
        preferredDays: new Set(),
        preferredPeriods: new Set(),
      },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('forbidden_slot')
  })

  it('rejects same teacher+class+subject twice on same day', () => {
    const placed: PlacedBlock[] = [
      {
        ...block,
        blockId: 'existing',
        day: 'monday',
        startPeriod: 1,
        startMin: 0,
        endMin: 40,
        startTime: '07:00',
        endTime: '07:40',
      },
    ]
    const result = canPlace(block, { day: 'monday', startPeriod: 3, span: 1 }, placed)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('teacher_class_subject_same_day')
  })

  it('allows non-overlapping placement', () => {
    const placed: PlacedBlock[] = [
      {
        ...block,
        blockId: 'existing',
        day: 'monday',
        startPeriod: 1,
        startMin: 0,
        endMin: 40,
        startTime: '07:00',
        endTime: '07:40',
      },
    ]
    const other: SchedulerBlock = {
      ...block,
      blockId: 'b2',
      teacherId: 't2',
      subjectId: 's2',
    }
    const result = canPlace(other, { day: 'monday', startPeriod: 2, span: 1 }, placed)
    expect(result.ok).toBe(true)
  })

  it('rejects second double same class+subject on same day (non-overlapping periods)', () => {
    const doubleBlock: SchedulerBlock = {
      blockId: 'b1',
      allocationId: 'a1',
      teacherId: 't1',
      classId: 'c1',
      subjectId: 's1',
      span: 2,
      unitType: 'DOUBLE',
    }
    const placed: PlacedBlock[] = [
      {
        ...doubleBlock,
        blockId: 'existing',
        day: 'thursday',
        startPeriod: 1,
        startMin: 0,
        endMin: 80,
        startTime: '07:00',
        endTime: '08:20',
      },
    ]
    const secondDouble: SchedulerBlock = {
      ...doubleBlock,
      blockId: 'b2',
      teacherId: 't2',
    }
    const result = canPlace(secondDouble, { day: 'thursday', startPeriod: 3, span: 2 }, placed)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('class_subject_same_day')
  })

  it('allows second double same teacher on same day for different class', () => {
    const doubleBlock: SchedulerBlock = {
      blockId: 'b1',
      allocationId: 'a1',
      teacherId: 't1',
      classId: 'c1',
      subjectId: 's1',
      span: 2,
      unitType: 'DOUBLE',
    }
    const placed: PlacedBlock[] = [
      {
        ...doubleBlock,
        blockId: 'existing',
        day: 'friday',
        startPeriod: 1,
        startMin: 0,
        endMin: 80,
        startTime: '07:00',
        endTime: '08:20',
      },
    ]
    const otherClass: SchedulerBlock = {
      ...doubleBlock,
      blockId: 'b2',
      classId: 'c2',
      subjectId: 's2',
    }
    const result = canPlace(otherClass, { day: 'friday', startPeriod: 3, span: 2 }, placed)
    expect(result.ok).toBe(true)
  })
})

describe('wouldStackSameDay', () => {
  it('returns false for single-period blocks', () => {
    expect(
      wouldStackSameDay({ teacherId: 't1', classId: 'c1', subjectId: 's1', span: 1 }, 'monday', [])
    ).toBe(false)
  })

  it('blocks same class+subject double on same day', () => {
    expect(
      wouldStackSameDay({ teacherId: 't1', classId: 'c1', subjectId: 's1', span: 2 }, 'monday', [
        { teacherId: 't2', classId: 'c1', subjectId: 's1', day: 'monday', span: 2 },
      ])
    ).toBe(true)
  })

  it('allows same teacher double on same day for different class', () => {
    expect(
      wouldStackSameDay({ teacherId: 't1', classId: 'c2', subjectId: 's1', span: 2 }, 'monday', [
        { teacherId: 't1', classId: 'c1', subjectId: 's1', day: 'monday', span: 2 },
      ])
    ).toBe(false)
  })
})

describe('periodsOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(periodsOverlap(1, 2, 2, 1)).toBe(true)
    expect(periodsOverlap(1, 1, 3, 1)).toBe(false)
  })
})

describe('generateTimetable', () => {
  const daySlots = {
    monday: [
      {
        type: 'period' as const,
        periodNumber: 1,
        start: 0,
        end: 40,
        startTime: '07:00',
        endTime: '07:40',
        durationMin: 40,
        day: 'monday',
      },
      {
        type: 'period' as const,
        periodNumber: 2,
        start: 40,
        end: 80,
        startTime: '07:40',
        endTime: '08:20',
        durationMin: 40,
        day: 'monday',
      },
      {
        type: 'period' as const,
        periodNumber: 3,
        start: 100,
        end: 140,
        startTime: '08:40',
        endTime: '09:20',
        durationMin: 40,
        day: 'monday',
      },
    ],
    tuesday: [
      {
        type: 'period' as const,
        periodNumber: 1,
        start: 0,
        end: 40,
        startTime: '07:00',
        endTime: '07:40',
        durationMin: 40,
        day: 'tuesday',
      },
      {
        type: 'period' as const,
        periodNumber: 2,
        start: 40,
        end: 80,
        startTime: '07:40',
        endTime: '08:20',
        durationMin: 40,
        day: 'tuesday',
      },
    ],
  }

  it('places non-conflicting singles', () => {
    const result = generateTimetable(
      [
        {
          id: 'a1',
          teacherId: 't1',
          classId: 'c1',
          subjectId: 's1',
          periodsPerWeek: 1,
          blockType: 'SINGLE',
        },
        {
          id: 'a2',
          teacherId: 't2',
          classId: 'c2',
          subjectId: 's2',
          periodsPerWeek: 1,
          blockType: 'SINGLE',
        },
      ],
      daySlots,
      { singleMin: 40, maxExecutionMs: 5000 }
    )
    expect(result.stats.placed).toBe(2)
    expect(result.stats.unplaced).toBe(0)
  })

  it('spreads three doubles for one allocation across multiple days when feasible', () => {
    const wednesday = [
      {
        type: 'period' as const,
        periodNumber: 1,
        start: 0,
        end: 40,
        startTime: '07:00',
        endTime: '07:40',
        durationMin: 40,
        day: 'wednesday',
      },
      {
        type: 'period' as const,
        periodNumber: 2,
        start: 40,
        end: 80,
        startTime: '07:40',
        endTime: '08:20',
        durationMin: 40,
        day: 'wednesday',
      },
    ]
    const slots = { ...daySlots, wednesday }

    const result = generateTimetable(
      [
        {
          id: 'a1',
          teacherId: 't1',
          classId: 'c1',
          subjectId: 's1',
          periodsPerWeek: 6,
          blockType: 'DOUBLE',
        },
      ],
      slots,
      { singleMin: 40, maxExecutionMs: 8000 }
    )

    expect(result.stats.placed).toBeGreaterThan(0)
    const daysUsed = new Set(result.placedBlocks.map((p) => p.day))
    expect(daysUsed.size).toBeGreaterThanOrEqual(2)
  })

  it('places six doubles for one teacher across two classes on a five-day grid', () => {
    const makeDay = (day: string, periods: number) => {
      const slots = []
      let cursor = 0
      for (let p = 1; p <= periods; p++) {
        slots.push({
          type: 'period' as const,
          periodNumber: p,
          start: cursor,
          end: cursor + 40,
          startTime: '07:00',
          endTime: '07:40',
          durationMin: 40,
          day,
        })
        cursor += 40
      }
      return slots
    }
    const daySlots = {
      monday: makeDay('monday', 8),
      tuesday: makeDay('tuesday', 8),
      wednesday: makeDay('wednesday', 8),
      thursday: makeDay('thursday', 8),
      friday: makeDay('friday', 8),
    }

    const result = generateTimetable(
      [
        {
          id: 'a1',
          teacherId: 't1',
          classId: 'c1',
          subjectId: 'math',
          doublePeriods: 3,
          periodsPerWeek: 6,
          blockType: 'DOUBLE',
        },
        {
          id: 'a2',
          teacherId: 't1',
          classId: 'c2',
          subjectId: 'math',
          doublePeriods: 3,
          periodsPerWeek: 6,
          blockType: 'DOUBLE',
        },
      ],
      daySlots,
      { singleMin: 40, maxExecutionMs: 15000, maxRestarts: 5 }
    )

    expect(result.stats.placed).toBe(6)
    expect(result.stats.unplaced).toBe(0)
  })

  it('spreads period numbers for one teacher instead of stacking period 1–2 every day', () => {
    const makeDay = (day: string, periods: number) => {
      const slots = []
      let cursor = 0
      for (let p = 1; p <= periods; p++) {
        slots.push({
          type: 'period' as const,
          periodNumber: p,
          start: cursor,
          end: cursor + 40,
          startTime: '07:00',
          endTime: '07:40',
          durationMin: 40,
          day,
        })
        cursor += 40
      }
      return slots
    }
    const daySlots = {
      monday: makeDay('monday', 8),
      tuesday: makeDay('tuesday', 8),
      wednesday: makeDay('wednesday', 8),
      thursday: makeDay('thursday', 8),
      friday: makeDay('friday', 8),
    }

    const result = generateTimetable(
      [
        {
          id: 'a1',
          teacherId: 't1',
          classId: 'c1',
          subjectId: 'chem',
          doublePeriods: 2,
          periodsPerWeek: 4,
          blockType: 'DOUBLE',
        },
        {
          id: 'a2',
          teacherId: 't1',
          classId: 'c2',
          subjectId: 'chem',
          doublePeriods: 2,
          periodsPerWeek: 4,
          blockType: 'DOUBLE',
        },
      ],
      daySlots,
      { singleMin: 40, maxExecutionMs: 15000, maxRestarts: 5 }
    )

    expect(result.stats.placed).toBe(4)
    const teacherBlocks = result.placedBlocks.filter((p) => p.teacherId === 't1')
    const startPeriods = teacherBlocks.map((p) => p.startPeriod)
    const uniquePeriods = new Set(startPeriods)
    expect(uniquePeriods.size).toBeGreaterThanOrEqual(3)
    const allEarlyEveryDay = teacherBlocks.every((p) => p.startPeriod <= 2)
    expect(allEarlyEveryDay).toBe(false)
  })

  it('spreads one teacher doubles across at least three weekdays when possible', () => {
    const makeDay = (day: string, periods: number) => {
      const slots = []
      let cursor = 0
      for (let p = 1; p <= periods; p++) {
        slots.push({
          type: 'period' as const,
          periodNumber: p,
          start: cursor,
          end: cursor + 40,
          startTime: '07:00',
          endTime: '07:40',
          durationMin: 40,
          day,
        })
        cursor += 40
      }
      return slots
    }
    const daySlots = {
      monday: makeDay('monday', 8),
      tuesday: makeDay('tuesday', 8),
      wednesday: makeDay('wednesday', 8),
      thursday: makeDay('thursday', 8),
      friday: makeDay('friday', 8),
    }

    const result = generateTimetable(
      [
        {
          id: 'a1',
          teacherId: 't1',
          classId: 'c1',
          subjectId: 'chem',
          doublePeriods: 2,
          periodsPerWeek: 4,
          blockType: 'DOUBLE',
        },
        {
          id: 'a2',
          teacherId: 't1',
          classId: 'c2',
          subjectId: 'chem',
          doublePeriods: 2,
          periodsPerWeek: 4,
          blockType: 'DOUBLE',
        },
      ],
      daySlots,
      { singleMin: 40, maxExecutionMs: 15000, maxRestarts: 5 }
    )

    expect(result.stats.placed).toBe(4)
    const teacherDays = new Set(
      result.placedBlocks.filter((p) => p.teacherId === 't1').map((p) => p.day)
    )
    expect(teacherDays.size).toBeGreaterThanOrEqual(3)
  })

  it('varies period distribution across restart seeds', () => {
    const makeDay = (day: string, periods: number) => {
      const slots = []
      let cursor = 0
      for (let p = 1; p <= periods; p++) {
        slots.push({
          type: 'period' as const,
          periodNumber: p,
          start: cursor,
          end: cursor + 40,
          startTime: '07:00',
          endTime: '07:40',
          durationMin: 40,
          day,
        })
        cursor += 40
      }
      return slots
    }
    const daySlots = {
      monday: makeDay('monday', 8),
      tuesday: makeDay('tuesday', 8),
      wednesday: makeDay('wednesday', 8),
      thursday: makeDay('thursday', 8),
      friday: makeDay('friday', 8),
    }
    const allocations = [
      {
        id: 'a1',
        teacherId: 't1',
        classId: 'c1',
        subjectId: 'chem',
        doublePeriods: 2,
        periodsPerWeek: 4,
        blockType: 'DOUBLE',
      },
      {
        id: 'a2',
        teacherId: 't1',
        classId: 'c2',
        subjectId: 'chem',
        doublePeriods: 2,
        periodsPerWeek: 4,
        blockType: 'DOUBLE',
      },
    ]

    const signatures = new Set<string>()
    for (let seed = 0; seed < 3; seed++) {
      const result = generateTimetableOnce(allocations, daySlots, {
        singleMin: 40,
        maxExecutionMs: 15000,
        restartSeed: seed,
      })
      const sig = result.placedBlocks
        .filter((p) => p.teacherId === 't1')
        .map((p) => `${p.day}:P${p.startPeriod}`)
        .sort()
        .join('|')
      signatures.add(sig)
    }

    expect(signatures.size).toBeGreaterThanOrEqual(2)
  })
})
