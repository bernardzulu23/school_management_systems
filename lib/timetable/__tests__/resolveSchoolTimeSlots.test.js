import { describe, expect, it } from 'vitest'
import {
  buildTeacherAvailabilityFromConfig,
  buildTimeSlotsFromConfig,
  resolveSchoolTimeSlots,
} from '@/lib/timetable/timeSlotsFromConfig'

describe('resolveSchoolTimeSlots', () => {
  const config = {
    startTime: '08:15',
    endTime: '15:45',
    singleDuration: 45,
    workingDays: ['Monday', 'Tuesday'],
    breakSlots: [{ start: '11:00', end: '11:20', label: 'Break' }],
  }

  it('builds rows from TimetableConfig when no DB slots', () => {
    const slots = resolveSchoolTimeSlots(config, [])
    expect(slots[0].startTime).toBe('08:15')
    expect(slots.some((s) => s.isBreak && s.startTime === '11:00')).toBe(true)
  })

  it('overlays DB start/end on matching periods', () => {
    const built = buildTimeSlotsFromConfig(config)
    const mondayP1 = built.find((s) => s.dayOfWeek === 'monday' && s.period === 1 && !s.isBreak)
    const db = [
      {
        ...mondayP1,
        id: 'db-1',
        startTime: '08:20',
        endTime: '09:05',
      },
    ]
    const merged = resolveSchoolTimeSlots(config, db)
    const p1 = merged.find((s) => s.dayOfWeek === 'monday' && s.period === 1 && !s.isBreak)
    expect(p1?.startTime).toBe('08:20')
    expect(p1?.endTime).toBe('09:05')
  })
})

describe('buildTeacherAvailabilityFromConfig', () => {
  it('uses school start/end for each working day', () => {
    const rows = buildTeacherAvailabilityFromConfig({
      startTime: '07:45',
      endTime: '16:00',
      workingDays: ['Monday', 'Friday'],
      singleDuration: 40,
      breakSlots: [],
    })
    expect(rows).toHaveLength(2)
    expect(rows[0].startTime).toBe('07:45')
    expect(rows[0].endTime).toBe('16:00')
    expect(rows[1].dayOfWeek).toBe('friday')
  })
})
