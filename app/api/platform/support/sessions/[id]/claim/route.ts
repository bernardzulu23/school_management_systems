import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { claimHandoffSession } from '@/lib/ai/chat/handoff'
import { signChatWsTicket, chatDoWssBaseUrl } from '@/lib/ai/chat/ws-ticket'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/platform/support/sessions/[id]/claim
 *
 * Sets assignedToId + HUMAN_ACTIVE only after server-side platform_admin verification.
 * Then notifies the Durable Object so it accepts this admin's WebSocket.
 *
 * PILOT STAGE: escalations route to platform admin. Once past single-school
 * pilot, change escalation target to same-tenant Headteacher/HOD — see
 * ZSMS_chatbot_architecture_review.md. This routing choice should not become
 * permanent by default.
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

  const result = await claimHandoffSession({
    sessionId,
    adminUserId: String(auth.user.id),
  })
  if (!result.ok) {
    return secureJson({ error: result.error }, { status: result.status }, request)
  }

  const wssBase = chatDoWssBaseUrl()
  let wsUrl: string | null = null
  let ticket: string | null = null
  if (wssBase) {
    ticket = signChatWsTicket({
      sessionId: result.session.id,
      userId: String(auth.user.id),
      connectionRole: 'admin',
    })
    wsUrl = `${wssBase.replace(/\/$/, '')}/ws?sessionId=${encodeURIComponent(result.session.id)}&ticket=${encodeURIComponent(ticket)}`
  }

  return NextResponse.json({
    success: true,
    session: {
      id: result.session.id,
      status: result.session.status,
      assignedToId: result.session.assignedToId,
    },
    ticket,
    wsUrl,
  })
})
