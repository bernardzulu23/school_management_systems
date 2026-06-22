export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

/** Offline sync legacy endpoint — returns empty grade list (use /api/assessments or /api/ecz/scores). */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response

  return NextResponse.json({ success: true, data: [] })
})

export const POST = withErrorHandler(async function POST() {
  return NextResponse.json(
    { error: 'Use POST /api/assessments/sba-scores or ECZ score routes for grade entry.' },
    { status: 400 }
  )
})
