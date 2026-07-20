import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { requireChatAuth, loadChatSession, assertSessionRole } from '@/lib/ai/chat/session'
import { isHandoffStatus } from '@/lib/ai/chat/handoff'
import { signChatWsTicket, chatDoWssBaseUrl } from '@/lib/ai/chat/ws-ticket'
import { secureJson } from '@/lib/security/api'
import { basePrisma } from '@/lib/prisma/client'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  /** When true, issue an admin ticket (platform_admin + claimed session only). */
  asAdmin: z.boolean().optional(),
})

/**
 * POST /api/chat/ws-ticket
 * Issues a short-lived HMAC ticket for Durable Object WebSocket connect.
 * Admin tickets require server-side platform_admin + HUMAN_ACTIVE + assignedToId match.
 */
export const POST = withErrorHandler(async function POST(request: Request) {
  const raw = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return secureJson(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
      request
    )
  }

  const wssBase = chatDoWssBaseUrl()
  if (!wssBase) {
    return secureJson(
      { error: 'Realtime relay not configured', code: 'CHAT_DO_NOT_CONFIGURED' },
      { status: 503 },
      request
    )
  }

  if (parsed.data.asAdmin) {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated || !auth.user) {
      return auth.response as Response
    }
    const gate = requirePlatformAdmin(auth.user)
    if (!gate.ok) {
      return secureJson({ error: gate.error }, { status: gate.status }, request)
    }

    const session = await basePrisma.chatSession.findUnique({
      where: { id: parsed.data.sessionId },
    })
    if (!session) {
      return secureJson({ error: 'Session not found' }, { status: 404 }, request)
    }
    if (session.status !== 'HUMAN_ACTIVE' || session.assignedToId !== String(auth.user.id)) {
      return secureJson(
        { error: 'Claim session before connecting as admin' },
        { status: 403 },
        request
      )
    }

    const ticket = signChatWsTicket({
      sessionId: session.id,
      userId: String(auth.user.id),
      connectionRole: 'admin',
    })
    const url = `${wssBase.replace(/\/$/, '')}/ws?sessionId=${encodeURIComponent(session.id)}&ticket=${encodeURIComponent(ticket)}`
    return NextResponse.json({ success: true, ticket, url, status: session.status })
  }

  const chatAuth = await requireChatAuth(request)
  if (!chatAuth.ok) return chatAuth.response

  const session = await loadChatSession({
    schoolId: chatAuth.schoolId,
    userId: String(chatAuth.user.id),
    sessionId: parsed.data.sessionId,
  })
  if (!session) {
    return secureJson({ error: 'Session not found' }, { status: 404 }, request)
  }

  const mismatch = await assertSessionRole(request, session, chatAuth.chatRole)
  if (mismatch) return mismatch

  if (!isHandoffStatus(session.status)) {
    return secureJson(
      { error: 'WebSocket available only during human handoff' },
      { status: 409 },
      request
    )
  }

  const ticket = signChatWsTicket({
    sessionId: session.id,
    userId: String(chatAuth.user.id),
    connectionRole: 'user',
  })
  const url = `${wssBase.replace(/\/$/, '')}/ws?sessionId=${encodeURIComponent(session.id)}&ticket=${encodeURIComponent(ticket)}`
  return NextResponse.json({ success: true, ticket, url, status: session.status })
})
