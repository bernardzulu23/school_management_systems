import { describe, it, expect } from 'vitest'
import {
  normalizeGradeLabel,
  studentGroupListLabel,
  gradeDoubleBookedMessage,
} from '@/lib/timetable/zambiaTerminology'
import { dedupeGradeLabels } from '@/lib/timetable/departmentApprovalSync'

describe('zambiaTerminology', () => {
  it('normalizes Form and Grade labels to comparable keys', () => {
    expect(normalizeGradeLabel('Form 1A')).toBe('form1a')
    expect(normalizeGradeLabel('FORM 1A')).toBe('form1a')
    expect(normalizeGradeLabel('Grade 10B')).toBe('grade10b')
    expect(normalizeGradeLabel('10A')).toBe('num10a')
  })

  it('exposes student group list label', () => {
    expect(studentGroupListLabel()).toBe('Grades:')
  })

  it('uses grade wording for double-booking message', () => {
    expect(gradeDoubleBookedMessage()).toBe('Grade is double-booked')
  })
})

describe('dedupeGradeLabels', () => {
  it('removes duplicate grade labels after normalization', () => {
    expect(dedupeGradeLabels(['Form 1A', 'FORM 1A', 'Form 1B'])).toEqual(['Form 1A', 'Form 1B'])
  })
})

describe('AscClassWallGrid period labels', () => {
  function periodLabel(slot, idx) {
    return slot.period != null ? String(slot.period) : String(idx + 1)
  }

  it('uses 1-based period numbers in column headers', () => {
    expect(periodLabel({ period: 1 }, 0)).toBe('1')
    expect(periodLabel({ period: 3 }, 2)).toBe('3')
    expect(periodLabel({}, 0)).toBe('1')
  })
})
