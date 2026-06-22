export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

/**
 * Legacy announcements API — returns school notices until a dedicated model exists.
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: [] })
})

export const POST = withErrorHandler(async function POST() {
  return NextResponse.json(
    { error: 'Announcements are not enabled yet. Use SMS broadcast or student notices.' },
    { status: 501 }
  )
})
