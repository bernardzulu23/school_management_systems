export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { logAuditAction } from '@/lib/auditLog'

function isValidMonthKey(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || '').trim())
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'administrator', 'admin', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const month = String(body?.month || '').trim()
  const note = String(body?.note || '').trim()
  if (!isValidMonthKey(month)) {
    return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 })
  }

  await logAuditAction({
    userId: String(auth.user.id || ''),
    schoolId,
    action: 'ATTENDANCE_MONTHLY_RETURN_SUBMITTED',
    entity: 'AttendanceReturn',
    entityId: month,
    newValue: { month, note, submittedAt: new Date().toISOString(), source: 'dashboard' },
    request,
  })

  return NextResponse.json({ success: true, month })
})
