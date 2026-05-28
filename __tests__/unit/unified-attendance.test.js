import { describe, it, expect } from 'vitest'
import { sessionStatusToDaily, getDayBounds } from '@/lib/attendance/unified-register'

describe('unified attendance register', () => {
  it('maps session statuses to daily register values', () => {
    expect(sessionStatusToDaily('PRESENT')).toBe('present')
    expect(sessionStatusToDaily('LATE')).toBe('late')
    expect(sessionStatusToDaily('ABSENT')).toBe('absent')
    expect(sessionStatusToDaily('EXCUSED')).toBe('excused')
  })

  it('computes UTC day bounds', () => {
    const bounds = getDayBounds('2026-05-28')
    expect(bounds).not.toBeNull()
    expect(bounds.start.toISOString()).toBe('2026-05-28T00:00:00.000Z')
    expect(bounds.end.toISOString()).toBe('2026-05-29T00:00:00.000Z')
  })
})
