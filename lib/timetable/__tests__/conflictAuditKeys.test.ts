import { describe, expect, it } from 'vitest'
import {
  getConflictAuditKey,
  filterIgnoredConflicts,
  isDismissibleAuditConflict,
  withAuditKeys,
} from '@/lib/timetable/conflictAudit'

describe('getConflictAuditKey stability', () => {
  it('uses class+subject+teacher+expected for MISSING_PERIODS (not allocation UUID)', () => {
    const a = {
      type: 'MISSING_PERIODS',
      allocationId: 'alloc-old',
      classId: 'c1',
      teacherId: 't1',
      subjectIds: ['chem'],
      expectedPeriods: 3,
      severity: 'warning',
    }
    const b = {
      ...a,
      allocationId: 'alloc-new-after-repush',
      affectedEntryIds: ['e1', 'e2'],
    }
    expect(getConflictAuditKey(a)).toBe('MISSING_PERIODS:c1:chem:t1:3')
    expect(getConflictAuditKey(b)).toBe(getConflictAuditKey(a))
  })

  it('keeps CLASS_DOUBLE_BOOKED key stable when entry UUID sets change', () => {
    const base = {
      type: 'CLASS_DOUBLE_BOOKED',
      classId: 'c10a',
      day: 'friday',
      startTime: '07:30',
      subjectIds: ['home'],
      subjectNames: ['Home Management'],
      severity: 'error',
    }
    const k1 = getConflictAuditKey({ ...base, affectedEntryIds: ['a', 'b', 'c'] })
    const k2 = getConflictAuditKey({ ...base, affectedEntryIds: ['a'] })
    expect(k1).toBe('CLASS_DOUBLE_BOOKED:c10a:home:friday:07:30')
    expect(k2).toBe(k1)
  })

  it('filterIgnoredConflicts matches semantic keys after entry id churn', () => {
    const conflict = withAuditKeys([
      {
        type: 'MISSING_PERIODS',
        classId: 'c1',
        teacherId: 't1',
        subjectIds: ['chem'],
        expectedPeriods: 3,
        severity: 'warning',
        description: 'missing',
      },
    ])[0]
    const ignored = [getConflictAuditKey(conflict)]
    expect(filterIgnoredConflicts([conflict], ignored)).toEqual([])
    // Same logical gap, new allocation + entry ids
    const again = {
      ...conflict,
      allocationId: 'brand-new',
      affectedEntryIds: ['x', 'y'],
      auditKey: undefined,
    }
    expect(filterIgnoredConflicts([again], ignored)).toEqual([])
  })

  it('does not allow dismissing hard errors', () => {
    expect(
      isDismissibleAuditConflict({
        type: 'CLASS_DOUBLE_BOOKED',
        severity: 'error',
        classId: 'c',
        day: 'monday',
        startTime: '08:00',
      })
    ).toBe(false)
    expect(
      isDismissibleAuditConflict({
        type: 'MISSING_PERIODS',
        severity: 'warning',
        classId: 'c',
        teacherId: 't',
        subjectIds: ['s'],
        expectedPeriods: 3,
      })
    ).toBe(true)
  })
})
