import { describe, it, expect } from 'vitest'
import {
  canPlace,
  consecutivePeriodsAreValid,
  expandAllocationsIntoBlocks,
  generateTimetable,
} from '@/lib/timetable/scheduler'
import { runPreflightFeasibility } from '@/lib/timetable/preflightFeasibility'
import { blocksToSolverLessons } from '@/lib/timetable/buildBlockSolverPayload'

function makeDaySlots(periodsPerDay = 8) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  const out = {}
  for (const day of days) {
    const slots = []
    let cursor = 8 * 60
    for (let p = 1; p <= periodsPerDay; p++) {
      if (p === 3) {
        slots.push({
          type: 'break',
          periodNumber: 0,
          start: cursor,
          end: cursor + 20,
          startTime: '09:20',
          endTime: '09:40',
          durationMin: 20,
          day,
        })
        cursor += 20
      }
      slots.push({
        type: 'period',
        periodNumber: p,
        start: cursor,
        end: cursor + 40,
        startTime: '08:00',
        endTime: '08:40',
        durationMin: 40,
        day,
      })
      cursor += 40
    }
    out[day] = slots
  }
  return out
}

describe('consecutivePeriodsAreValid', () => {
  it('rejects doubles spanning break after period 2', () => {
    expect(consecutivePeriodsAreValid(2, 2)).toBe(false)
    expect(consecutivePeriodsAreValid(1, 2)).toBe(true)
  })
})

describe('canPlace locked slots', () => {
  it('blocks teacher when period is locked', () => {
    const block = {
      blockId: 'b1',
      allocationId: 'a1',
      teacherId: 't1',
      classId: 'c1',
      subjectId: 's1',
      span: 1,
      unitType: 'SINGLE',
    }
    const reserved = new Set(['t1|monday|1'])
    const result = canPlace(block, { day: 'monday', startPeriod: 1, span: 1 }, [], {
      reservedTeacherSlots: reserved,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('locked_slot')
  })
})

describe('runPreflightFeasibility', () => {
  it('flags overloaded teacher with named message', () => {
    const daySlots = makeDaySlots(4)
    const allocations = Array.from({ length: 25 }, (_, i) => ({
      id: `a${i}`,
      teacherId: 't1',
      classId: `c${i}`,
      subjectId: 's1',
      periodsPerWeek: 1,
      blockType: 'SINGLE',
      teacher: { name: 'MWALE LAUNDANI' },
    }))
    const result = runPreflightFeasibility({ allocations, daySlots, singleMin: 40 })
    expect(result.ok).toBe(false)
    expect(result.blocking.some((b) => b.code === 'TEACHER_OVERLOAD')).toBe(true)
    expect(result.blocking[0]?.message).toContain('MWALE LAUNDANI')
    expect(result.blocking[0]?.message).toContain('Reduce allocations')
  })

  it('does not false-alarm when doubles sum to more period-slots than grid capacity', () => {
    const daySlots = makeDaySlots(9)
    const allocations = Array.from({ length: 71 }, (_, i) => ({
      id: `a${i}`,
      teacherId: `t${i % 20}`,
      classId: `c${i % 47}`,
      subjectId: 's1',
      singlePeriods: 0,
      doublePeriods: 1,
      triplePeriods: 0,
      periodsPerWeek: 2,
      blockType: 'DOUBLE',
    }))
    const result = runPreflightFeasibility({ allocations, daySlots, singleMin: 40 })
    expect(result.blocking.some((b) => b.code === 'GLOBAL_OVERLOAD')).toBe(false)
    expect(result.blocking.some((b) => b.code === 'CLASS_OVERLOAD')).toBe(false)
    expect(result.ok).toBe(true)
  })
})

describe('generateTimetable', () => {
  it('places small fixture without conflicts', () => {
    const daySlots = makeDaySlots(8)
    const allocations = [
      {
        id: 'a1',
        teacherId: 't1',
        classId: 'c1',
        subjectId: 'math',
        periodsPerWeek: 2,
        blockType: 'SINGLE',
      },
      {
        id: 'a2',
        teacherId: 't2',
        classId: 'c1',
        subjectId: 'eng',
        periodsPerWeek: 2,
        blockType: 'SINGLE',
      },
    ]
    const result = generateTimetable(allocations, daySlots, {
      maxExecutionMs: 5000,
      maxRestarts: 2,
    })
    expect(result.unplacedBlocks.length).toBe(0)
    expect(result.entries.length).toBeGreaterThan(0)
  })
})

describe('blocksToSolverLessons', () => {
  it('creates atomic group for double blocks', () => {
    const blocks = expandAllocationsIntoBlocks([
      {
        id: 'a1',
        teacherId: 't1',
        classId: 'c1',
        subjectId: 's1',
        periodsPerWeek: 4,
        blockType: 'DOUBLE',
      },
    ])
    const { lessons, atomicGroups } = blocksToSolverLessons(blocks)
    expect(blocks.length).toBe(2)
    expect(lessons.length).toBe(4)
    expect(atomicGroups.length).toBe(2)
    expect(atomicGroups[0].lessonIds.length).toBe(2)
  })
})
