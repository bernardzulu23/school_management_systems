export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { closeAttendanceSession } from '@/lib/attendance/sessions'

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

  const session = await closeAttendanceSession({
    sessionId,
    schoolId,
    sendAbsentSms: body.sendAbsentSms !== false,
  })

  return NextResponse.json({ success: true, data: session })
})
