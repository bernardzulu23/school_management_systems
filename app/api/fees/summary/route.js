export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeFeeRoute } from '@/lib/fees/routeAuth'
import { getFeeSummary } from '@/lib/fees/summary'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const summary = await getFeeSummary(access.schoolId)
  return NextResponse.json({ success: true, ...summary })
})
