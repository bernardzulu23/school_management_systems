export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute } from '@/lib/government/routeAuth'
import { createLeave, listLeaveWithBalances } from '@/lib/government/leave'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withSecureHandler(async function GET(request) {
  const access = await authorizeGovernmentRoute(request, 'teacher-leave')
  if (!access.ok) return access.response

  const data = await listLeaveWithBalances(access.schoolId)
  return NextResponse.json({ success: true, data })
})

export const POST = withSecureHandler(async function POST(request) {
  const access = await authorizeGovernmentRoute(request, 'teacher-leave')
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const teacherId = safeStringId(body.teacherId)
  const leaveType = safeStringId(body.leaveType, { maxLength: 64 })
  if (!teacherId || !leaveType || !body.startDate || !body.endDate) {
    return NextResponse.json(
      { error: 'teacherId, leaveType, startDate, and endDate are required' },
      { status: 400 }
    )
  }

  const leave = await createLeave(access.schoolId, { ...body, teacherId, leaveType })
  return NextResponse.json({ success: true, leave }, { status: 201 })
})
