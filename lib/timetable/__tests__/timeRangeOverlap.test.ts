import { describe, expect, it } from 'vitest'
import {
  buildClassDoubleBookedMessage,
  halfOpenTimeRangesOverlap,
  timedSlotsOverlap,
} from '@/lib/timetable/timeRangeOverlap'

describe('halfOpenTimeRangesOverlap (EXCLUDE twin)', () => {
  it('detects overlapping windows', () => {
    expect(halfOpenTimeRangesOverlap('friday', '07:00', '07:40', 'friday', '07:20', '08:00')).toBe(
      true
    )
  })

  it('treats end touching start as adjacent, not overlapping', () => {
    expect(halfOpenTimeRangesOverlap('friday', '07:30', '08:50', 'friday', '08:50', '09:30')).toBe(
      false
    )
  })

  it('ignores different days', () => {
    expect(halfOpenTimeRangesOverlap('friday', '07:00', '08:00', 'monday', '07:00', '08:00')).toBe(
      false
    )
  })
})

describe('buildClassDoubleBookedMessage', () => {
  it('cites both windows for same subject', () => {
    const msg = buildClassDoubleBookedMessage({
      className: '10A',
      dayOfWeek: 'friday',
      entries: [
        { subjectName: 'Chichewa', startTime: '07:00', endTime: '07:40' },
        { subjectName: 'Chichewa', startTime: '07:20', endTime: '08:00' },
      ],
    })
    expect(msg).toBe(
      '10A has two Chichewa periods scheduled at overlapping times: 07:00–07:40 and 07:20–08:00 (friday)'
    )
  })

  it('lists both subjects when they differ', () => {
    const msg = buildClassDoubleBookedMessage({
      className: '10A',
      dayOfWeek: 'monday',
      entries: [
        { subjectName: 'Math', startTime: '08:00', endTime: '08:40' },
        { subjectName: 'English', startTime: '08:00', endTime: '08:40' },
      ],
    })
    expect(msg).toMatch(/Math and English/)
    expect(msg).toMatch(/08:00–08:40/)
  })
})

describe('timedSlotsOverlap', () => {
  it('respects season when both set', () => {
    expect(
      timedSlotsOverlap(
        { dayOfWeek: 'monday', startTime: '08:00', endTime: '09:00', season: 'rainy' },
        { dayOfWeek: 'monday', startTime: '08:00', endTime: '09:00', season: 'dry' }
      )
    ).toBe(false)
  })
})
