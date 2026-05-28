export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getAttendanceLiveSummary } from '@/lib/attendance/live-summary'

/**
 * GET /api/dashboard/attendance-live
 * Real-time attendance summary for headteacher dashboard (60s cache; ?refresh=1 bypasses).
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'administrator', 'admin', 'superadmin'])) {
    return NextResponse.json({ error: 'Forbidden: Headteacher access only' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get('refresh') === '1'

  const data = await getAttendanceLiveSummary(schoolId, { refresh })
  return NextResponse.json(data)
})
