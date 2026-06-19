export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeProprietorRoute } from '@/lib/fees/routeAuth'
import { getProprietorOverview } from '@/lib/fees/proprietor'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeProprietorRoute(request)
  if (!access.ok) return access.response

  const data = await getProprietorOverview(access.schoolId)
  return NextResponse.json({ success: true, data })
})
