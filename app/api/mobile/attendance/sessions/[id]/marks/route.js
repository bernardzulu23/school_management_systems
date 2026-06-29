export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { recordAttendanceMark } from '@/lib/attendance/sessions'
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'

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
  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  try {
    const mark = await recordAttendanceMark({
      sessionId,
      schoolId,
      studentId,
      method: body.method || 'MANUAL',
      faceMatchScore: body.faceMatchScore,
      secondaryVerified: Boolean(body.secondaryVerified),
      statusOverride: body.status ? String(body.status).toUpperCase() : undefined,
    })
    return NextResponse.json({ success: true, data: mark })
  } catch (e) {
    if (e.code === 'TWIN_SECONDARY_AUTH_REQUIRED') {
      return NextResponse.json(
        { error: 'Twin verification required', code: e.code },
        { status: 409 }
      )
    }
    throw e
  }
})
