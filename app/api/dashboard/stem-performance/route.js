export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { getStemPerformanceSummary } from '@/lib/dashboard/schoolAnalytics'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const gate = await requireFeature(schoolId, 'stem-monitoring')
  if (gate instanceof NextResponse) return gate

  const data = await getStemPerformanceSummary(schoolId)
  return NextResponse.json({ success: true, data })
})
