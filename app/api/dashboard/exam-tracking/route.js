export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { getExamTrackingSummary } from '@/lib/dashboard/schoolAnalytics'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const gate = await requireFeature(schoolId, 'ecz-tracking')
  if (gate instanceof NextResponse) return gate

  const data = await getExamTrackingSummary(schoolId)
  return NextResponse.json({ success: true, data })
})
