/**
 * QR Code Attendance System
 *
 * HOW IT WORKS:
 * 1. Teacher starts a QR session via POST /api/attendance/qr-generate
 * 2. Server signs session data as a JWT (15 min expiry)
 * 3. QR encodes a URL: /attend?t={token}
 * 4. Students scan → confirm name → POST /api/attendance/qr-mark
 *
 * SECURITY:
 * - JWT signed with JWT_SECRET + '-qr-attendance' (separate from auth tokens)
 * - 15 minute expiry
 * - Enrollment checked at mark time; one present/late mark per student per session
 */
import QRCode from 'qrcode'
import jwt from 'jsonwebtoken'
import { env } from '@/lib/config/env'

export const QR_EXPIRY_MINUTES = 15
const QR_SECRET_SUFFIX = '-qr-attendance'

function qrSigningSecret() {
  const base = String(env.jwtSecret || '').trim()
  if (!base) {
    throw new Error('JWT_SECRET is not configured')
  }
  return base + QR_SECRET_SUFFIX
}

/**
 * @param {Object} session
 * @param {string} session.sessionId
 * @param {string} session.schoolId
 * @param {string} session.classId
 * @param {string} session.subjectId
 * @param {string} session.teacherId
 * @param {string} session.baseUrl
 * @returns {Promise<{qrDataUrl: string, token: string, expiresAt: Date, attendanceUrl: string}>}
 */
export async function generateAttendanceQR(session) {
  const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000)
  const baseUrl = String(session.baseUrl || '').replace(/\/+$/, '')

  const token = jwt.sign(
    {
      type: 'attendance-qr',
      sessionId: session.sessionId,
      schoolId: session.schoolId,
      classId: session.classId,
      subjectId: session.subjectId,
      teacherId: session.teacherId,
    },
    qrSigningSecret(),
    { expiresIn: `${QR_EXPIRY_MINUTES}m` }
  )

  const attendanceUrl = `${baseUrl}/attend?t=${encodeURIComponent(token)}`

  const qrDataUrl = await QRCode.toDataURL(attendanceUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: { dark: '#1a5c36', light: '#ffffff' },
  })

  return { qrDataUrl, token, expiresAt, attendanceUrl }
}

/**
 * @param {string} token
 * @returns {{ sessionId: string, schoolId: string, classId: string, subjectId: string, teacherId: string }}
 */
export function validateAttendanceToken(token) {
  const decoded = jwt.verify(String(token || '').trim(), qrSigningSecret())
  if (decoded.type !== 'attendance-qr') {
    const err = new Error('Invalid token type')
    err.code = 'INVALID_QR_TOKEN'
    throw err
  }
  return {
    sessionId: decoded.sessionId,
    schoolId: decoded.schoolId,
    classId: decoded.classId,
    subjectId: decoded.subjectId,
    teacherId: decoded.teacherId,
  }
}

export function normalizeStudentName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Resolve a roster entry by exact name (case-insensitive) or studentId.
 * @param {Array<{id: string, name: string}>} roster
 * @param {{ studentId?: string, studentName?: string }} input
 */
export function resolveStudentFromRoster(roster, input) {
  const studentId = String(input.studentId || '').trim()
  if (studentId) {
    return roster.find((s) => s.id === studentId) || null
  }

  const target = normalizeStudentName(input.studentName)
  if (!target) return null

  const exact = roster.filter((s) => normalizeStudentName(s.name) === target)
  if (exact.length === 1) return exact[0]

  const partial = roster.filter((s) => {
    const n = normalizeStudentName(s.name)
    return n.includes(target) || target.includes(n)
  })
  if (partial.length === 1) return partial[0]

  return null
}
