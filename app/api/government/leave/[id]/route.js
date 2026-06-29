export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { roleCheck } from '@/lib/middleware/auth'
import { authorizeGovernmentRoute } from '@/lib/government/routeAuth'
import { updateLeaveStatus } from '@/lib/government/leave'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

const ALLOWED_LEAVE_STATUS = new Set(['approved', 'rejected'])

export const PATCH = withSecureHandler(async function PATCH(request, context) {
  const access = await authorizeGovernmentRoute(request, 'teacher-leave')
  if (!access.ok) return access.response

  if (!roleCheck(access.auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Only headteachers can approve leave' }, { status: 403 })
  }

  const leaveId = await safeRouteParam(context.params, 'id')
  if (!leaveId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const status = String(body.status || '').toLowerCase()
  if (!ALLOWED_LEAVE_STATUS.has(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const leave = await updateLeaveStatus(access.schoolId, leaveId, status, access.auth.user?.id)
  if (!leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, leave })
})
