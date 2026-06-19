export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeParentPortalRoute } from '@/lib/fees/routeAuth'
import { getParentPortalData } from '@/lib/fees/parentPortal'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeParentPortalRoute(request)
  if (!access.ok) return access.response

  const data = await getParentPortalData(access.schoolId, access.auth.user?.id)
  if (!data) throw new ApiError('Student profile not found', 404)

  return NextResponse.json({ success: true, data })
})
