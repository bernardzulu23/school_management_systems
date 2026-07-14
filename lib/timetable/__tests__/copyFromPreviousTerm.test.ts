import { describe, expect, it } from 'vitest'
import {
  resolvePreviousSeason,
  buildTeachableBellIndex,
  remapEntriesToCurrentBell,
} from '@/lib/timetable/copyFromPreviousTerm'
import {
  DEFAULT_TIMETABLE_CONFIG,
  normalizeTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'

describe('resolvePreviousSeason', () => {
  it('rolls Term 2 → Term 1 same year', () => {
    expect(resolvePreviousSeason('Term 2', '2026')).toEqual({
      term: 'Term 1',
      academicYear: '2026',
    })
  })

  it('rolls Term 1 → Term 3 prior year', () => {
    expect(resolvePreviousSeason('Term 1', '2026')).toEqual({
      term: 'Term 3',
      academicYear: '2025',
    })
  })
})

describe('remapEntriesToCurrentBell', () => {
  it('snaps entry times to current bell by period number', () => {
    const cfg = normalizeTimetableConfig({
      ...DEFAULT_TIMETABLE_CONFIG,
      startTime: '08:00',
      endTime: '12:00',
      singleDuration: 40,
      breakSlots: [],
    })
    const bell = buildTeachableBellIndex(cfg)
    const { entries, unmapped } = remapEntriesToCurrentBell(
      [
        {
          teacherId: 't1',
          dayOfWeek: 'monday',
          periodNumber: 1,
          startTime: '07:00',
          endTime: '07:40',
          periodType: 'SINGLE',
          durationMin: 40,
        },
      ],
      bell
    )
    expect(unmapped).toHaveLength(0)
    expect(entries[0].dayOfWeek).toBe('Monday')
    expect(entries[0].startTime).toBe(bell.byPeriod.get(1).startTime)
    expect(entries[0].endTime).toBe(bell.byPeriod.get(1).endTime)
  })

  it('keeps unmapped periods when bell no longer has that period number', () => {
    const cfg = normalizeTimetableConfig({
      ...DEFAULT_TIMETABLE_CONFIG,
      startTime: '08:00',
      endTime: '09:00',
      singleDuration: 40,
      breakSlots: [],
    })
    const bell = buildTeachableBellIndex(cfg)
    const { unmapped, entries } = remapEntriesToCurrentBell(
      [
        {
          dayOfWeek: 'Monday',
          periodNumber: 9,
          startTime: '14:00',
          endTime: '14:40',
          periodType: 'SINGLE',
        },
      ],
      bell
    )
    expect(unmapped).toHaveLength(1)
    expect(entries[0].startTime).toBe('14:00')
  })
})
