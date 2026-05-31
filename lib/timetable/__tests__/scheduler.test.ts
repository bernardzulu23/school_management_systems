import { describe, it, expect } from 'vitest'
import { validateBundle, autoBundleSplit } from '@/lib/timetable/bundle-utils'
import {
  canPlace,
  consecutivePeriodsAreValid,
  generateTimetable,
  periodsOverlap,
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

  it('detects teacher conflict', () => {
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
    const result = canPlace(block, { day: 'monday', startPeriod: 1, span: 1 }, placed)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('teacher_conflict')
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
})
