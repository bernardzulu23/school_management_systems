import { describe, expect, it } from 'vitest'
import {
  CLASS_OVERLAP_CONSTRAINT,
  TEACHER_OVERLAP_CONSTRAINT,
  formatTimetableExcludeMessage,
  interpretTimetableExcludeError,
} from '../excludeConstraintError'

describe('interpretTimetableExcludeError', () => {
  it('maps class exclusion constraint', () => {
    const err = {
      code: '23P01',
      message: `conflicting key value violates exclusion constraint "${CLASS_OVERLAP_CONSTRAINT}"`,
    }
    const mapped = interpretTimetableExcludeError(err)
    expect(mapped.isExcludeViolation).toBe(true)
    expect(mapped.code).toBe('CLASS_DOUBLE_BOOKED')
  })

  it('maps teacher exclusion constraint with teacher name', () => {
    const err = {
      code: '23P01',
      message: `conflicting key value violates exclusion constraint "${TEACHER_OVERLAP_CONSTRAINT}"`,
    }
    const mapped = interpretTimetableExcludeError(err)
    expect(mapped.code).toBe('TEACHER_DOUBLE_BOOKED')
    expect(
      formatTimetableExcludeMessage(mapped, {
        teacherName: 'Andrew Simwanza',
        dayOfWeek: 'Monday',
        startTime: '07:00',
        endTime: '07:40',
      })
    ).toContain('Andrew Simwanza')
  })

  it('ignores unrelated errors', () => {
    expect(
      interpretTimetableExcludeError({ code: 'P2003', message: 'FK' }).isExcludeViolation
    ).toBe(false)
  })
})
