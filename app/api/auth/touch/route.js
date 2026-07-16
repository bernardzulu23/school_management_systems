export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { authMiddleware } from '@/lib/middleware/auth'
import { stampActivityOnResponse } from '@/lib/security/sessionActivity'

/**
 * Explicit "stay signed in" — stamps server-side last-activity for cookie sessions.
 * Subject to CSRF; not a passive poll endpoint.
 */
export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  await stampActivityOnResponse(response, request)
  return response
})
