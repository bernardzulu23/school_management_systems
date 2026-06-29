export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { notifyParentAttendance } from '@/lib/attendance/parentNotifications'
import { safeStringId } from '@/lib/security/safeQueryValue'

/** DEV ONLY — test parent attendance SMS for a student. */
export const POST = withErrorHandler(async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const studentId = safeStringId(body?.studentId)
  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 })
  }

  const result = await notifyParentAttendance({
    studentId,
    schoolId,
    status: body?.status || 'absent',
    date: new Date(),
  })

  return NextResponse.json(result)
})
