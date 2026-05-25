export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

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

  const { id: sessionId } = await params
  const body = await request.json().catch(() => ({}))
  const studentId = String(body.studentId || '').trim()
  const pin = body.pin != null ? String(body.pin) : ''
  const biometricVerified = Boolean(body.biometricVerified)

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
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

  if (biometricVerified) {
    return NextResponse.json({ success: true, data: { verified: true, method: 'FINGERPRINT' } })
  }

  const method = String(student.secondaryAuthMethod || 'PIN').toUpperCase()
  if (method === 'FINGERPRINT') {
    return NextResponse.json(
      { error: 'Biometric verification required for this pupil', code: 'BIOMETRIC_REQUIRED' },
      { status: 400 }
    )
  }

  if (!pin) {
    return NextResponse.json({ error: 'PIN is required', code: 'PIN_REQUIRED' }, { status: 400 })
  }

  if (!student.pinHash) {
    return NextResponse.json(
      {
        error: 'Twin PIN not configured. Ask admin to set a PIN for this pupil.',
        code: 'PIN_NOT_SET',
      },
      { status: 400 }
    )
  }

  const ok = await bcrypt.compare(pin, student.pinHash)
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect PIN', code: 'PIN_INVALID' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    data: { verified: true, method: 'PIN', sessionId, studentId },
  })
})
