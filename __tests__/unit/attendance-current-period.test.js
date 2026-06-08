import { describe, it, expect } from 'vitest'
import { resolveCurrentPeriod } from '@/lib/attendance/live-summary'

describe('resolveCurrentPeriod', () => {
  const slots = [
    {
      dayOfWeek: 'Monday',
      startTime: '08:00',
      endTime: '08:40',
      period: 1,
      isBreak: false,
    },
    {
      dayOfWeek: 'Monday',
      startTime: '08:40',
      endTime: '09:20',
      period: 2,
      isBreak: false,
    },
  ]

  it('detects active period from bell schedule', () => {
    const monday900 = new Date('2026-06-01T07:00:00.000Z')
    const result = resolveCurrentPeriod(slots, monday900)
    expect(result.isActive).toBe(true)
    expect(result.period).toBe(2)
    expect(result.timeRange).toBe('08:40–09:20')
  })
})
