import { describe, expect, it } from 'vitest'
import { solveTimetable, type SolverPayload, type TimeSlot } from '@/lib/timetable/greedySolver'
import {
  consecutivePeriodsAreValid,
  deriveBreakAfterPeriodsFromFlatSlots,
} from '@/lib/timetable/scheduler'
import { shrinkSummaryForIgnored } from '@/lib/timetable/conflictAudit'

function slot(
  id: string,
  day: string,
  period: number,
  isBreak = false,
  startTime?: string,
  endTime?: string
): TimeSlot {
  // Realistic bell times: P1 07:40, P2 08:20, break 09:00, P3 09:20, P4 10:00
  const defaults: Record<number, [string, string]> = {
    0: ['09:00', '09:20'],
    1: ['07:40', '08:20'],
    2: ['08:20', '09:00'],
    3: ['09:20', '10:00'],
    4: ['10:00', '10:40'],
  }
  const [ds, de] = defaults[isBreak ? 0 : period] || ['07:00', '07:40']
  return {
    id,
    dayOfWeek: day,
    period: isBreak ? 0 : period,
    startTime: startTime || ds,
    endTime: endTime || de,
    isBreak,
  }
}

describe('deriveBreakAfterPeriodsFromFlatSlots', () => {
  it('marks periods that are followed by a break row', () => {
    const slots = [
      slot('p1', 'monday', 1),
      slot('p2', 'monday', 2),
      slot('b1', 'monday', 0, true),
      slot('p3', 'monday', 3),
      slot('p4', 'monday', 4),
    ]
    const after = deriveBreakAfterPeriodsFromFlatSlots(slots)
    expect(after).toContain(2)
    expect(consecutivePeriodsAreValid(2, 2, after)).toBe(false)
    expect(consecutivePeriodsAreValid(1, 2, after)).toBe(true)
    expect(consecutivePeriodsAreValid(3, 2, after)).toBe(true)
  })
})

describe('greedySolver break spanning', () => {
  it('does not place doubles across a break between P2 and P3', () => {
    const payload: SolverPayload = {
      name: 'test',
      maxSolutions: 1,
      teachers: [{ id: 't1' }],
      classes: [{ id: 'c1', name: 'Form 1A' }],
      slots: [
        slot('m1', 'monday', 1),
        slot('m2', 'monday', 2),
        slot('mb', 'monday', 0, true),
        slot('m3', 'monday', 3),
        slot('m4', 'monday', 4),
        slot('t1', 'tuesday', 1),
        slot('t2', 'tuesday', 2),
        slot('tb', 'tuesday', 0, true),
        slot('t3', 'tuesday', 3),
        slot('t4', 'tuesday', 4),
      ],
      // Empty lessons — expand from teacherAllocations so we get a real DOUBLE unit
      lessons: [],
      teacherAllocations: [
        {
          id: 'alloc-1',
          teacherId: 't1',
          classId: 'c1',
          subjectId: 'math',
          periodsPerWeek: 2,
          doublePeriods: 1,
          singlePeriods: 0,
          blockType: 'DOUBLE',
        },
      ],
      constraints: [],
      lockedAssignments: [],
      recipes: [],
      maxExecutionMs: 3000,
    }

    const result = solveTimetable(payload)
    const spanEntry = Object.entries(result.slotSpans).find(([, ids]) => ids.length === 2)
    expect(spanEntry, `expected a double span; stats=${JSON.stringify(result.stats)}`).toBeTruthy()
    const span = spanEntry![1]

    const byId = new Map(payload.slots.map((s) => [s.id, s]))
    const periods = span.map((id) => byId.get(id)!).sort((a, b) => a.period - b.period)
    expect(periods[0].period + 1).toBe(periods[1].period)
    const pair = `${periods[0].period}-${periods[1].period}`
    expect(pair).not.toBe('2-3')
  })
})

describe('shrinkSummaryForIgnored', () => {
  it('keeps canPublish false when source is not draft', () => {
    const summary = {
      source: 'published',
      conflicts: [{ type: 'MISSING_PERIODS', severity: 'warning', id: '1' }],
    }
    const shrunk = shrinkSummaryForIgnored(summary, ['MISSING_PERIODS:1'])
    expect(shrunk.canPublish).toBe(false)
  })

  it('allows canPublish when source is draft and no errors remain', () => {
    const summary = {
      source: 'draft',
      conflicts: [{ type: 'MISSING_PERIODS', severity: 'warning', auditKey: 'w1' }],
    }
    const shrunk = shrinkSummaryForIgnored(summary, ['w1'])
    expect(shrunk.errorCount).toBe(0)
    expect(shrunk.canPublish).toBe(true)
  })
})
