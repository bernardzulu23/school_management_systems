export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeFeeRoute } from '@/lib/fees/routeAuth'
import { listRecentPayments, recordPayment } from '@/lib/fees/payments'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50', 10)
  const payments = await listRecentPayments(access.schoolId, limit)
  return NextResponse.json({ success: true, payments })
})

export const POST = withErrorHandler(async function POST(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const result = await recordPayment(access.schoolId, access.auth.user?.id, body)
  if (!result) throw new ApiError('Invoice not found', 404)

  return NextResponse.json({ success: true, ...result })
})
