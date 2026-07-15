export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'

/**
 * Twin secondary auth — PIN only (server-side bcrypt).
 *
 * Prompt 23: a previous `biometricVerified: true` body flag was accepted with no
 * server corroboration (any client could set it). Device LocalAuthentication is
 * not a trustable remote signal without challenge signing / attestation.
 * Until that exists, secondaryAuthMethod FINGERPRINT is treated as "PIN required"
 * the same as PIN — do not advertise fingerprint as an enforced control.
 *
 * Face embeddings are unrelated; facial consent is enforced on face-enrollment /
 * verify-face / FACE marks.
 */
export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const sessionId = await safeRouteParam(params, 'id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
  }
  const body = await request.json().catch(() => ({}))
  const studentId = safeStringId(body.studentId)
  const pin = body.pin != null ? String(body.pin) : ''

  // Explicitly ignore any client-asserted biometric success (legacy clients).
  if (body.biometricVerified != null) {
    // no-op — discarded; never used for authorization
  }

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId, status: 'OPEN' },
    select: { id: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Session not found or closed' }, { status: 404 })
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      twinGroupId: true,
      requiresSecondaryAuth: true,
      secondaryAuthMethod: true,
      pinHash: true,
    },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  if (!student.requiresSecondaryAuth) {
    return NextResponse.json({ success: true, data: { verified: true, method: 'NONE' } })
  }

  if (!pin) {
    return NextResponse.json(
      {
        error: 'Twin PIN is required. Device biometrics alone are not accepted by the server.',
        code: 'PIN_REQUIRED',
        enforcedMethod: 'PIN',
      },
      { status: 400 }
    )
  }

  if (!student.pinHash) {
    return NextResponse.json(
      {
        error: 'Twin PIN not configured. Ask admin to set a PIN for this pupil.',
        code: 'PIN_NOT_SET',
        enforcedMethod: 'PIN',
      },
      { status: 400 }
    )
  }

  const ok = await bcrypt.compare(pin, student.pinHash)
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect PIN', code: 'PIN_INVALID' }, { status: 401 })
  }

  const { issueTwinAuthTicket } = await import('@/lib/attendance/twinAuthTicket')
  const ticket = issueTwinAuthTicket({ schoolId, sessionId, studentId })

  return NextResponse.json({
    success: true,
    data: {
      verified: true,
      method: 'PIN',
      sessionId,
      studentId,
      twinAuthToken: ticket.twinAuthToken,
      expiresAt: ticket.expiresAt,
      note: 'Secondary twin auth is PIN-verified on the server. Present twinAuthToken when marking attendance.',
    },
  })
})
