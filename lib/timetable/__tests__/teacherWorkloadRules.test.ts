import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEACHER_WORKLOAD_RULES,
  detectTeacherWorkloadIssues,
  teacherWorkloadPlacementViolation,
  assignmentPeriodWeight,
} from '@/lib/timetable/teacherWorkloadRules'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
} from '@/lib/timetable/validateTimetable'
import { parseSchedulingRulesJson } from '@/lib/timetable/teacherClassSessionRules'

const breaks = [
  { start: '10:10', end: '10:30', label: 'Break' },
  { start: '12:00', end: '12:40', label: 'Lunch', isLunch: true },
]

function frag(partial: Record<string, unknown>) {
  return {
    id: String(partial.id),
    teacherId: String(partial.teacherId || 't1'),
    dayOfWeek: String(partial.dayOfWeek || 'monday'),
    startTime: String(partial.startTime),
    endTime: String(partial.endTime),
    periodWeight: Number(partial.periodWeight || 1),
    teacherName: String(partial.teacherName || 'Ada'),
  }
}

describe('teacherWorkloadRules', () => {
  it('flags day overload above maxPeriodsPerDay (weight-aware)', () => {
    const issues = detectTeacherWorkloadIssues(
      [
        frag({ id: '1', startTime: '07:30', endTime: '08:10', periodWeight: 2 }),
        frag({ id: '2', startTime: '08:10', endTime: '08:50', periodWeight: 2 }),
        frag({ id: '3', startTime: '08:50', endTime: '09:30', periodWeight: 2 }),
        frag({ id: '4', startTime: '09:30', endTime: '10:10', periodWeight: 1 }),
      ],
      { maxPeriodsPerDay: 6, dayOverloadSeverity: 'soft' }
    )
    const day = issues.filter((i) => i.type === 'TEACHER_DAY_OVERLOAD')
    expect(day).toHaveLength(1)
    expect(day[0].message).toMatch(/7 periods/)
  })

  it('flags consecutive runs above maxConsecutivePeriods', () => {
    const issues = detectTeacherWorkloadIssues(
      [
        frag({ id: '1', startTime: '07:30', endTime: '08:10' }),
        frag({ id: '2', startTime: '08:10', endTime: '08:50' }),
        frag({ id: '3', startTime: '08:50', endTime: '09:30' }),
        frag({ id: '4', startTime: '09:30', endTime: '10:10' }),
        frag({ id: '5', startTime: '10:10', endTime: '10:50' }),
      ],
      { maxConsecutivePeriods: 4, consecutiveSeverity: 'soft', maxPeriodsPerDay: 10 }
    )
    expect(issues.some((i) => i.type === 'TEACHER_CONSECUTIVE_LIMIT')).toBe(true)
  })

  it('resets consecutive run across a longer gap (break)', () => {
    const issues = detectTeacherWorkloadIssues(
      [
        frag({ id: '1', startTime: '07:30', endTime: '08:10' }),
        frag({ id: '2', startTime: '08:10', endTime: '08:50' }),
        frag({ id: '3', startTime: '08:50', endTime: '09:30' }),
        frag({ id: '4', startTime: '09:30', endTime: '10:10' }),
        // lunch gap
        frag({ id: '5', startTime: '12:40', endTime: '13:20' }),
        frag({ id: '6', startTime: '13:20', endTime: '14:00' }),
      ],
      { maxConsecutivePeriods: 4, maxPeriodsPerDay: 10 }
    )
    expect(issues.filter((i) => i.type === 'TEACHER_CONSECUTIVE_LIMIT')).toHaveLength(0)
  })

  it('flags teaching through lunch as hard by default', () => {
    const issues = detectTeacherWorkloadIssues(
      [frag({ id: '1', startTime: '11:40', endTime: '12:20' })],
      DEFAULT_TEACHER_WORKLOAD_RULES,
      breaks
    )
    const hit = issues.filter((i) => i.type === 'TEACHER_BREAK_OVERLAP')
    expect(hit).toHaveLength(1)
    expect(hit[0].severity).toBe('hard')
    expect(hit[0].message).toMatch(/Lunch/)
  })

  it('placementViolation only blocks hard severities', () => {
    const placed = [
      frag({ id: '1', startTime: '07:30', endTime: '08:10' }),
      frag({ id: '2', startTime: '08:10', endTime: '08:50' }),
      frag({ id: '3', startTime: '08:50', endTime: '09:30' }),
      frag({ id: '4', startTime: '09:30', endTime: '10:10' }),
      frag({ id: '5', startTime: '10:10', endTime: '10:50' }),
      frag({ id: '6', startTime: '10:50', endTime: '11:30' }),
    ]
    const softDay = teacherWorkloadPlacementViolation(
      frag({ id: '7', startTime: '11:30', endTime: '12:10' }),
      placed,
      { maxPeriodsPerDay: 6, dayOverloadSeverity: 'soft' }
    )
    expect(softDay).toBeNull()

    const hardDay = teacherWorkloadPlacementViolation(
      frag({ id: '7', startTime: '11:30', endTime: '12:10' }),
      placed,
      { maxPeriodsPerDay: 6, dayOverloadSeverity: 'hard' }
    )
    expect(hardDay?.reason).toBe('teacher_day_limit')

    const breakHit = teacherWorkloadPlacementViolation(
      frag({ id: 'x', startTime: '12:00', endTime: '12:40' }),
      [],
      DEFAULT_TEACHER_WORKLOAD_RULES,
      breaks
    )
    expect(breakHit?.reason).toBe('teacher_break_overlap')
  })

  it('assignmentPeriodWeight counts doubles', () => {
    expect(assignmentPeriodWeight({ consecutivePeriods: 2 })).toBe(2)
    expect(assignmentPeriodWeight({ periodType: 'DOUBLE' })).toBe(2)
    expect(assignmentPeriodWeight({})).toBe(1)
  })
})

describe('validateTimetable workload wiring', () => {
  it('emits TEACHER_BREAK_OVERLAP when breakSlots provided', () => {
    const result = validateTimetable(
      [
        {
          id: 'a',
          season: 'normal',
          dayOfWeek: 'monday',
          startTime: '12:00',
          endTime: '12:40',
          period: 5,
          teacherId: 't1',
          classId: 'c1',
          subjectId: 's1',
          teacherName: 'Ada',
          isBreak: false,
        },
      ] as any,
      {
        breakSlots: breaks,
        teacherWorkloadRules: parseSchedulingRulesJson(null),
      }
    )
    expect(getHardConflicts(result).some((c) => c.type === 'TEACHER_BREAK_OVERLAP')).toBe(true)
  })

  it('keeps day overload soft by default', () => {
    const periods = Array.from({ length: 7 }, (_, i) => {
      const start = 7 * 60 + 30 + i * 40
      const hh = String(Math.floor(start / 60)).padStart(2, '0')
      const mm = String(start % 60).padStart(2, '0')
      const end = start + 40
      const eh = String(Math.floor(end / 60)).padStart(2, '0')
      const em = String(end % 60).padStart(2, '0')
      return {
        id: `p${i}`,
        season: 'normal',
        dayOfWeek: 'tuesday',
        startTime: `${hh}:${mm}`,
        endTime: `${eh}:${em}`,
        period: i + 1,
        teacherId: 't1',
        classId: `c${i}`,
        subjectId: `s${i}`,
        teacherName: 'Ada',
        isBreak: false,
      }
    })
    const result = validateTimetable(periods as any, {
      teacherWorkloadRules: parseSchedulingRulesJson(null),
    })
    const daySoft = getSoftConflicts(result).filter((c) => c.type === 'TEACHER_DAY_OVERLOAD')
    expect(daySoft.length).toBeGreaterThanOrEqual(1)
    expect(getHardConflicts(result).filter((c) => c.type === 'TEACHER_DAY_OVERLOAD')).toHaveLength(
      0
    )
  })
})
