export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getHeadteacherLiveAttendance } from '@/lib/attendance/sessions'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden: Headteacher access only' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const data = await getHeadteacherLiveAttendance(schoolId)
  return NextResponse.json({ success: true, data })
})
