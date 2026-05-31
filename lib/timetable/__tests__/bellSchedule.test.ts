import { describe, expect, it } from 'vitest'
import { compareBellRows, uniqueBellRows } from '@/lib/timetable/bellSchedule'
import { buildTimeSlotsFromConfig } from '@/lib/timetable/timeSlotsFromConfig'

describe('uniqueBellRows', () => {
  it('sorts by start time so breaks (period 0) stay in chronological order', () => {
    const slots = buildTimeSlotsFromConfig({
      startTime: '07:00',
      endTime: '14:00',
      singleDuration: 40,
      workingDays: ['Monday'],
      breakSlots: [{ start: '10:00', end: '10:20', label: 'Break' }],
    })

    const rows = uniqueBellRows(slots)
    const times = rows.map((r) => r.startTime)

    expect(times.indexOf('10:00')).toBeGreaterThan(times.indexOf('07:00'))
    expect(times.indexOf('10:00')).toBeLessThan(times.indexOf('10:20'))
    expect(rows.find((r) => r.isBreak)?.label).toBe('Break')
  })

  it('compareBellRows orders morning before break before afternoon', () => {
    expect(
      compareBellRows(
        { startTime: '07:00', endTime: '07:40', period: 1, isBreak: false },
        { startTime: '10:00', endTime: '10:20', period: 0, isBreak: true }
      )
    ).toBeLessThan(0)
  })
})
