export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    throw new ApiError('Forbidden', 403)
  }

  await request.json().catch(() => ({}))

  return NextResponse.json({ success: true })
})
