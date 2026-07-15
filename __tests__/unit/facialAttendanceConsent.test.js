import { describe, expect, it } from 'vitest'
import {
  sanitizeFaceEmbeddingPayload,
  isFacialAttendanceEnabled,
} from '@/lib/consent/facialAttendance'

describe('facialAttendance consent helpers', () => {
  it('rejects raw image payloads', () => {
    expect(() => sanitizeFaceEmbeddingPayload('data:image/jpeg;base64,aaaa')).toThrow(/Raw images/)
  })

  it('accepts numeric embedding arrays', () => {
    const raw = sanitizeFaceEmbeddingPayload([0.1, 0.2, 0.3])
    expect(JSON.parse(raw)).toEqual([0.1, 0.2, 0.3])
  })

  it('school gate defaults off', () => {
    expect(isFacialAttendanceEnabled({})).toBe(false)
    expect(isFacialAttendanceEnabled({ facialAttendanceEnabled: true })).toBe(true)
  })
})
