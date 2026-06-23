import { describe, it, expect } from 'vitest'
import { getSchoolStudentLimit, SCHOOL_STUDENT_LIMIT } from '@/lib/billing/plan-pricing'
import {
  rankTeachingSlots,
  scoreMoveSlot,
  scoreSchedulerPlacement,
} from '@/lib/timetable/slotScoring'

describe('school student limits', () => {
  it('sets basic to 500, standard to 800, premium unlimited', () => {
    expect(SCHOOL_STUDENT_LIMIT.basic).toBe(500)
    expect(SCHOOL_STUDENT_LIMIT.standard).toBe(800)
    expect(SCHOOL_STUDENT_LIMIT.premium).toBe(Infinity)
    expect(getSchoolStudentLimit('basic')).toBe(500)
    expect(getSchoolStudentLimit('standard')).toBe(800)
    expect(getSchoolStudentLimit('premium')).toBe(Infinity)
  })
})

describe('slotScoring', () => {
  const base = {
    id: 'a1',
    classId: 'c1',
    teacherId: 't1',
    classroomId: 'r1',
    dayOfWeek: 'monday',
    startTime: '07:00',
    endTime: '07:40',
    period: 1,
    season: 'normal',
    isBreak: false,
  }

  const slots = [
    { dayOfWeek: 'monday', startTime: '07:00', endTime: '07:40', period: 1, isBreak: false },
    { dayOfWeek: 'monday', startTime: '10:00', endTime: '10:40', period: 4, isBreak: false },
    { dayOfWeek: 'wednesday', startTime: '10:00', endTime: '10:40', period: 4, isBreak: false },
  ]

  it('prefers another day over same day when penalizeSameDay is true', () => {
    const ranked = rankTeachingSlots(slots, base, [base], {
      penalizeSameDay: true,
      excludeSameSlot: true,
      randomJitter: false,
    })
    expect(String(ranked[0].dayOfWeek).toLowerCase()).toBe('wednesday')
  })

  it('prefers mid-day periods on the same day', () => {
    const mondayOnly = slots.filter((s) => s.dayOfWeek === 'monday')
    const early = scoreMoveSlot({
      slot: mondayOnly[0],
      base,
      classAssignments: [base],
      penalizeSameDay: false,
      randomJitter: false,
    })
    const mid = scoreMoveSlot({
      slot: mondayOnly[1],
      base,
      classAssignments: [base],
      penalizeSameDay: false,
      randomJitter: false,
    })
    expect(mid).toBeLessThan(early)
  })

  it('uses random jitter when enabled', () => {
    const scores = new Set()
    for (let i = 0; i < 20; i++) {
      scores.add(
        scoreMoveSlot({
          slot: slots[1],
          base,
          classAssignments: [base],
          penalizeSameDay: false,
          randomJitter: true,
        })
      )
    }
    expect(scores.size).toBeGreaterThan(1)
  })

  it('scheduler placement penalizes repeating the same period on another day', () => {
    const placed = [{ teacherId: 't1', day: 'monday', startPeriod: 1 }]
    const repeatP1 = scoreSchedulerPlacement({
      teacherId: 't1',
      day: 'tuesday',
      startPeriod: 1,
      placed,
      randomJitter: false,
    })
    const spreadP4 = scoreSchedulerPlacement({
      teacherId: 't1',
      day: 'tuesday',
      startPeriod: 4,
      placed,
      randomJitter: false,
    })
    expect(spreadP4).toBeLessThan(repeatP1)
  })
})
