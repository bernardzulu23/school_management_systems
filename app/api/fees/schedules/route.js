export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeFeeRoute } from '@/lib/fees/routeAuth'
import { createSchedule, listSchedules } from '@/lib/fees/schedules'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const params = new URL(request.url).searchParams
  const year = params.get('year') ? parseInt(params.get('year'), 10) : undefined
  const schedules = await listSchedules(access.schoolId, { year })
  return NextResponse.json({ success: true, schedules })
})

export const POST = withErrorHandler(async function POST(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  if (!body.name || body.amount === undefined || !body.dueDate) {
    throw new ApiError('name, amount, and dueDate are required', 400)
  }

  const schedule = await createSchedule(access.schoolId, body)
  return NextResponse.json({ success: true, schedule }, { status: 201 })
})
