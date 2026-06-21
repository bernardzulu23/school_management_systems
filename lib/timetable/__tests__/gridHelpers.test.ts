import { describe, it, expect } from 'vitest'
import {
  alignAssignmentsToBellRows,
  assignmentsForPrimaryCell,
  calcRowSpan,
  rowSpanForAssignment,
} from '@/lib/timetable/gridHelpers'

const bellRows40 = [
  { period: 1, startTime: '07:00', endTime: '07:40', isBreak: false },
  { period: 2, startTime: '07:40', endTime: '08:20', isBreak: false },
  { period: 3, startTime: '08:20', endTime: '09:00', isBreak: false },
  { period: 0, startTime: '09:00', endTime: '09:20', isBreak: true, label: 'Break' },
  { period: 4, startTime: '09:20', endTime: '10:00', isBreak: false },
]

describe('calcRowSpan', () => {
  it('returns 1 for a single 40-min period', () => {
    expect(calcRowSpan('07:00', '07:40', bellRows40)).toBe(1)
  })

  it('returns 2 for a double 07:00–08:20', () => {
    expect(calcRowSpan('07:00', '08:20', bellRows40)).toBe(2)
  })

  it('returns 3 for a triple 07:30–09:30 spanning three slots', () => {
    const rows = [
      { period: 1, startTime: '07:30', endTime: '08:10', isBreak: false },
      { period: 2, startTime: '08:10', endTime: '08:50', isBreak: false },
      { period: 3, startTime: '08:50', endTime: '09:30', isBreak: false },
    ]
    expect(calcRowSpan('07:30', '09:30', rows)).toBe(3)
  })

  it('skips break rows when counting span', () => {
    expect(calcRowSpan('08:20', '10:00', bellRows40)).toBe(2)
  })
})

describe('rowSpanForAssignment', () => {
  it('uses consecutivePeriods when set', () => {
    const a = {
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '08:20',
      consecutivePeriods: 2,
      periodType: 'DOUBLE',
    }
    expect(rowSpanForAssignment(a, bellRows40)).toBe(2)
  })

  it('detects TRIPLE from periodType', () => {
    const a = {
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '09:00',
      periodType: 'TRIPLE',
      consecutivePeriods: 3,
    }
    expect(rowSpanForAssignment(a, bellRows40)).toBe(3)
  })

  it('falls back to time overlap when metadata missing', () => {
    const a = {
      dayOfWeek: 'monday',
      startTime: '07:00',
      endTime: '08:20',
    }
    expect(rowSpanForAssignment(a, bellRows40)).toBe(2)
  })
})

describe('alignAssignmentsToBellRows', () => {
  it('snaps mismatched start times to bell rows by period', () => {
    const bellRows = [
      { period: 1, startTime: '07:00', endTime: '07:40', isBreak: false },
      { period: 2, startTime: '07:40', endTime: '08:20', isBreak: false },
    ]
    const out = alignAssignmentsToBellRows(
      [
        {
          id: 'a1',
          dayOfWeek: 'monday',
          period: 1,
          startTime: '07:30',
          endTime: '07:40',
          subjectId: 's1',
        },
      ],
      bellRows
    )
    expect(out[0].startTime).toBe('07:00')
    expect(out[0].endTime).toBe('07:40')
    expect(assignmentsForPrimaryCell('monday', bellRows[0], out).map((a) => a.id)).toEqual(['a1'])
  })
})
