export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeGovernmentRoute } from '@/lib/government/routeAuth'
import { createLeave, listLeaveWithBalances } from '@/lib/government/leave'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const GET = withSecureApi(async function GET(request) {
  const access = await authorizeGovernmentRoute(request, 'teacher-leave')
  if (!access.ok) return access.response

  const data = await listLeaveWithBalances(access.schoolId)
  return NextResponse.json({ success: true, data })
})

export const POST = withSecureApi(async function POST(request) {
  const access = await authorizeGovernmentRoute(request, 'teacher-leave')
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const required = ['teacherId', 'leaveType', 'startDate', 'endDate']
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 })
    }
  }

  const leave = await createLeave(access.schoolId, body)
  return NextResponse.json({ success: true, leave }, { status: 201 })
})
