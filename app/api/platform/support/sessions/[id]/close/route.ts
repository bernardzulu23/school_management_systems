import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { closeHandoffSession } from '@/lib/ai/chat/handoff'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/platform/support/sessions/[id]/close
 * HUMAN_ACTIVE (or PENDING_HUMAN) → CLOSED. Platform admin only (pilot).
 */
export const POST = withErrorHandler(async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return auth.response as Response
  }
  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return secureJson({ error: gate.error }, { status: gate.status }, request)
  }

  const params = await Promise.resolve(context.params)
  const sessionId = String(params?.id || '').trim()
  if (!sessionId) throw new ApiError('Session id required', 400)

  const result = await closeHandoffSession({
    sessionId,
    actorUserId: String(auth.user.id),
  })
  if (!result.ok) {
    return secureJson({ error: result.error }, { status: result.status }, request)
  }

  return NextResponse.json({
    success: true,
    session: {
      id: result.session.id,
      status: result.session.status,
    },
  })
})
