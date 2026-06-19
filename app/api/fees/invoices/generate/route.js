export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeFeeRoute } from '@/lib/fees/routeAuth'
import { generateInvoicesForSchedule } from '@/lib/fees/invoices'

export const POST = withErrorHandler(async function POST(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const scheduleId = String(body.scheduleId || '')
  if (!scheduleId) throw new ApiError('scheduleId is required', 400)

  const result = await generateInvoicesForSchedule(access.schoolId, scheduleId)
  if (!result) throw new ApiError('Schedule not found', 404)

  return NextResponse.json({ success: true, ...result })
})
