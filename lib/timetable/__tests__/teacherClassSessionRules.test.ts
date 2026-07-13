import { describe, expect, it } from 'vitest'
import {
  TEACHER_CLASS_SUBJECT_SPLIT,
  TEACHER_CLASS_RETURN_TOO_SOON,
  collapseContiguousBlocks,
  detectTeacherClassSessionIssues,
  fragmentFromAssignment,
  fragmentsAreContiguous,
  teacherClassSessionPlacementViolation,
} from '@/lib/timetable/teacherClassSessionRules'

function frag(partial: Record<string, unknown>) {
  return fragmentFromAssignment({
    id: String(partial.id),
    teacherId: 't1',
    teacherName: 'Andrew Simwanza',
    classId: 'c1',
    className: 'Form 1B',
    subjectId: String(partial.subjectId || 'chem'),
    subjectName: String(partial.subjectName || 'Chemistry'),
    dayOfWeek: 'friday',
    period: Number(partial.period || 1),
    consecutivePeriods: Number(partial.span || 1),
    startTime: String(partial.startTime),
    endTime: String(partial.endTime),
  })!
}

describe('fragmentsAreContiguous', () => {
  it('treats abutting times as contiguous', () => {
    const a = frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 })
    const b = frag({ id: 'b', startTime: '07:40', endTime: '08:20', period: 2 })
    expect(fragmentsAreContiguous(a, b)).toBe(true)
  })

  it('treats gapped times as non-contiguous', () => {
    const a = frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 })
    const b = frag({ id: 'b', startTime: '10:00', endTime: '10:40', period: 5 })
    expect(fragmentsAreContiguous(a, b)).toBe(false)
  })
})

describe('Rule A TEACHER_CLASS_SUBJECT_SPLIT', () => {
  it('allows one continuous multi-period block as two abutting rows', () => {
    const issues = detectTeacherClassSessionIssues([
      frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 }),
      frag({ id: 'b', startTime: '07:40', endTime: '08:20', period: 2 }),
    ])
    expect(issues.filter((i) => i.type === TEACHER_CLASS_SUBJECT_SPLIT)).toHaveLength(0)
  })

  it('flags non-contiguous same-subject repeats as hard', () => {
    const issues = detectTeacherClassSessionIssues([
      frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 }),
      frag({ id: 'b', startTime: '10:00', endTime: '10:40', period: 5 }),
    ])
    const split = issues.filter((i) => i.type === TEACHER_CLASS_SUBJECT_SPLIT)
    expect(split).toHaveLength(1)
    expect(split[0].severity).toBe('hard')
    expect(split[0].message).toMatch(/Andrew Simwanza teaches Chemistry to Form 1B twice/)
    expect(split[0].message).toMatch(/07:00–07:40/)
    expect(split[0].message).toMatch(/10:00–10:40/)
    expect(split[0].message).toMatch(/not a continuous block/)
  })

  it('collapseContiguousBlocks merges abutting rows only', () => {
    const blocks = collapseContiguousBlocks([
      frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 }),
      frag({ id: 'b', startTime: '07:40', endTime: '08:20', period: 2 }),
      frag({ id: 'c', startTime: '10:00', endTime: '10:40', period: 5 }),
    ])
    expect(blocks).toHaveLength(2)
  })
})

describe('Rule B TEACHER_CLASS_RETURN_TOO_SOON', () => {
  it('flags different-subject return with gap below minimum', () => {
    const issues = detectTeacherClassSessionIssues(
      [
        frag({
          id: 'a',
          subjectId: 'chem',
          subjectName: 'Chemistry',
          startTime: '07:20',
          endTime: '08:00',
          period: 2,
        }),
        frag({
          id: 'b',
          subjectId: 'eng',
          subjectName: 'English',
          startTime: '08:20',
          endTime: '09:00',
          period: 3,
        }),
      ],
      { minGapPeriods: 1 }
    )
    const tooSoon = issues.filter((i) => i.type === TEACHER_CLASS_RETURN_TOO_SOON)
    expect(tooSoon).toHaveLength(1)
    expect(tooSoon[0].severity).toBe('soft')
    expect(tooSoon[0].message).toMatch(/returns to Form 1B for English at 08:20/)
    expect(tooSoon[0].message).toMatch(/only 0 periods after Chemistry ended at 08:00/)
    expect(tooSoon[0].message).toMatch(/minimum gap is 1 period/)
  })

  it('allows different-subject return when gap meets minimum', () => {
    const issues = detectTeacherClassSessionIssues(
      [
        frag({
          id: 'a',
          subjectId: 'chem',
          subjectName: 'Chemistry',
          startTime: '07:00',
          endTime: '07:40',
          period: 1,
        }),
        frag({
          id: 'b',
          subjectId: 'eng',
          subjectName: 'English',
          startTime: '09:00',
          endTime: '09:40',
          period: 4,
        }),
      ],
      { minGapPeriods: 1 }
    )
    // periods 2 and 3 free → gap = 4-1-1 = 2 >= 1
    expect(issues.filter((i) => i.type === TEACHER_CLASS_RETURN_TOO_SOON)).toHaveLength(0)
  })

  it('does not treat contiguous same-subject rows as Rule B', () => {
    const issues = detectTeacherClassSessionIssues([
      frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 }),
      frag({ id: 'b', startTime: '07:40', endTime: '08:20', period: 2 }),
    ])
    expect(issues).toHaveLength(0)
  })
})

describe('teacherClassSessionPlacementViolation', () => {
  it('blocks placing a non-contiguous same-subject second block', () => {
    const placed = [frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 })]
    const cand = frag({ id: 'b', startTime: '10:00', endTime: '10:40', period: 5 })
    const v = teacherClassSessionPlacementViolation(cand, placed)
    expect(v?.rule).toBe(TEACHER_CLASS_SUBJECT_SPLIT)
    expect(v?.severity).toBe('hard')
  })

  it('allows placing the abutting next period of the same subject', () => {
    const placed = [frag({ id: 'a', startTime: '07:00', endTime: '07:40', period: 1 })]
    const cand = frag({ id: 'b', startTime: '07:40', endTime: '08:20', period: 2 })
    expect(teacherClassSessionPlacementViolation(cand, placed)).toBeNull()
  })
})
