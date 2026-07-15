export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden: Admin or Headteacher only' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const studentId = await safeRouteParam(params, 'id')
  if (!studentId) {
    return NextResponse.json({ error: 'Student id is required' }, { status: 400 })
  }
  const body = await request.json().catch(() => ({}))
  const pin = String(body.pin || '').trim()

  if (!pin || pin.length < 4) {
    return NextResponse.json({ error: 'PIN must be at least 4 characters' }, { status: 400 })
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const pinHash = await bcrypt.hash(pin, 10)
  const updateResult = await prisma.student.updateMany({
    where: { id: studentId, schoolId },
    data: {
      pinHash,
      requiresSecondaryAuth: true,
      secondaryAuthMethod: body.secondaryAuthMethod || 'PIN',
      ...(body.twinGroupId ? { twinGroupId: String(body.twinGroupId) } : {}),
    },
  })
  if (updateResult.count === 0) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, studentId })
})
