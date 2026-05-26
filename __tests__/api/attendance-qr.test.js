/**
 * QR attendance token and roster matching
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('@/lib/config/env', () => ({
  env: { jwtSecret: 'test-jwt-secret-at-least-32-chars-long!!' },
}))

const {
  generateAttendanceQR,
  validateAttendanceToken,
  resolveStudentFromRoster,
  QR_EXPIRY_MINUTES,
} = await import('@/lib/attendance/qr.js')

describe('lib/attendance/qr', () => {
  const session = {
    sessionId: 'sess-1',
    schoolId: 'school-1',
    classId: 'class-1',
    subjectId: 'sub-1',
    teacherId: 'teacher-1',
    baseUrl: 'https://demo.example.com',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-26T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generates QR payload with 15 minute expiry', async () => {
    const result = await generateAttendanceQR(session)
    expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/)
    expect(result.attendanceUrl).toContain('/attend?t=')
    expect(result.token).toBeTruthy()

    const expectedExpiry = new Date('2026-05-26T10:15:00.000Z').getTime()
    expect(result.expiresAt.getTime()).toBe(expectedExpiry)
    expect(QR_EXPIRY_MINUTES).toBe(15)
  })

  it('validates a token signed for attendance-qr', async () => {
    const { token } = await generateAttendanceQR(session)
    const decoded = validateAttendanceToken(token)
    expect(decoded).toMatchObject({
      sessionId: session.sessionId,
      schoolId: session.schoolId,
      classId: session.classId,
      subjectId: session.subjectId,
      teacherId: session.teacherId,
    })
  })

  it('rejects expired tokens', async () => {
    const { token } = await generateAttendanceQR(session)
    vi.setSystemTime(new Date('2026-05-26T10:20:00.000Z'))
    expect(() => validateAttendanceToken(token)).toThrow()
  })

  it('rejects wrong token type', () => {
    const bad = jwt.sign(
      { type: 'other', sessionId: 'x' },
      'test-jwt-secret-at-least-32-chars-long!!-qr-attendance'
    )
    expect(() => validateAttendanceToken(bad)).toThrow(/Invalid token type/)
  })

  it('resolveStudentFromRoster matches by id and name', () => {
    const roster = [
      { id: 'a', name: 'Chanda Banda' },
      { id: 'b', name: 'Mary Phiri' },
    ]
    expect(resolveStudentFromRoster(roster, { studentId: 'b' })?.name).toBe('Mary Phiri')
    expect(resolveStudentFromRoster(roster, { studentName: 'chanda banda' })?.id).toBe('a')
    expect(resolveStudentFromRoster(roster, { studentName: 'Unknown' })).toBeNull()
  })
})
