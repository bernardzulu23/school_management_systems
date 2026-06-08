import { describe, it, expect } from 'vitest'
import { todayDateStrLusaka } from '@/lib/compliance/attendanceToday'

describe('attendanceToday compliance helpers', () => {
  it('formats today in Africa/Lusaka', () => {
    const str = todayDateStrLusaka(new Date('2026-06-01T12:00:00.000Z'))
    expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
