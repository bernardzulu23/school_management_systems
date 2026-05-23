export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { recordAttendanceMark } from '@/lib/attendance/sessions'

export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { id: sessionId } = await params
  const body = await request.json().catch(() => ({}))
  const studentId = String(body.studentId || '').trim()
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
