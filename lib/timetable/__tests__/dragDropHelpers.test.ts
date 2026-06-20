import { describe, it, expect } from 'vitest'
import type { BellScheduleSlot } from '@/lib/timetable/bellSchedule'
import {
  buildAssignmentAtSlot,
  dropTargetId,
  endTimeForSpanAtSlot,
  parseDropTargetId,
  planDrop,
} from '@/lib/timetable/dragDropHelpers'

const bellRows: BellScheduleSlot[] = [
  { period: 1, startTime: '07:00', endTime: '07:40', isBreak: false, dayOfWeek: 'monday' },
  { period: 2, startTime: '07:40', endTime: '08:20', isBreak: false, dayOfWeek: 'monday' },
  { period: 3, startTime: '08:20', endTime: '09:00', isBreak: false, dayOfWeek: 'monday' },
]

describe('dropTargetId', () => {
  it('encodes day, period, and start time', () => {
    expect(dropTargetId('monday', { period: 2, startTime: '07:40' })).toBe('monday|2|07:40')
  })

  it('parses back', () => {
    expect(parseDropTargetId('tuesday|3|08:20')).toEqual({
      dayOfWeek: 'tuesday',
      period: 3,
      startTime: '08:20',
    })
  })
})

describe('endTimeForSpanAtSlot', () => {
  it('extends end time for double period', () => {
    const assignment = {
      id: 'a1',
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '08:20',
      period: 1,
      consecutivePeriods: 2,
      periodType: 'DOUBLE',
      season: 'normal',
    } as any
    const target = bellRows[2]
    expect(endTimeForSpanAtSlot(assignment, target, bellRows)).toBe('09:00')
  })
})

describe('buildAssignmentAtSlot', () => {
  it('moves assignment to new day and slot', () => {
    const assignment = {
      id: 'a1',
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '07:40',
      period: 1,
      season: 'normal',
      classId: 'c1',
      teacherId: 't1',
      subjectId: 's1',
    } as any
    const next = buildAssignmentAtSlot(assignment, 'tuesday', bellRows[1], bellRows)
    expect(next.dayOfWeek).toBe('tuesday')
    expect(next.startTime).toBe('07:40')
    expect(next.endTime).toBe('08:20')
    expect(next.period).toBe(2)
  })
})

describe('planDrop', () => {
  const ctx = { teachers: [], classrooms: [], classes: [], seasonMode: 'normal' as const }

  it('returns move for empty valid slot', () => {
    const dragged = {
      id: 'a1',
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '07:40',
      period: 1,
      season: 'normal',
      classId: 'c1',
      teacherId: 't1',
      subjectId: 's1',
    } as any

    const plan = planDrop({
      dragged,
      targetDay: 'tuesday',
      targetSlot: bellRows[1],
      assignments: [dragged],
      bellRows,
      ctx,
    })
    expect(plan.kind).toBe('move')
    if (plan.kind === 'move') {
      expect(plan.nextA.dayOfWeek).toBe('tuesday')
    }
  })

  it('returns noop when dropped on same slot', () => {
    const dragged = {
      id: 'a1',
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '07:40',
      period: 1,
      season: 'normal',
    } as any
    const plan = planDrop({
      dragged,
      targetDay: 'monday',
      targetSlot: bellRows[0],
      assignments: [dragged],
      bellRows,
      ctx,
    })
    expect(plan.kind).toBe('noop')
  })
})
