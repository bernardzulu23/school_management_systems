import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { requireChatAuth, loadChatSession, assertSessionRole } from '@/lib/ai/chat/session'
import { requestHumanHandoff, buildHandoffClientPayload } from '@/lib/ai/chat/handoff'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  sessionId: z.string().uuid(),
})

/**
 * POST /api/chat/request-human
 *
 * Sets session.status = PENDING_HUMAN and sends a metadata-only Telegram alert
 * (tenant name, role, admin console deep link — never message content).
 *
 * PILOT STAGE: escalations route to platform admin. Once past single-school
 * pilot, change escalation target to same-tenant Headteacher/HOD — see
 * ZSMS_chatbot_architecture_review.md. This routing choice should not become
 * permanent by default.
 */
export const POST = withErrorHandler(async function POST(request: Request) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  const raw = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return secureJson(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
      request
    )
  }

  const session = await loadChatSession({
    schoolId: auth.schoolId,
    userId: String(auth.user.id),
    sessionId: parsed.data.sessionId,
  })
  if (!session) {
    return secureJson({ error: 'Session not found' }, { status: 404 }, request)
  }

  const mismatch = await assertSessionRole(request, session, auth.chatRole)
  if (mismatch) return mismatch

  if (session.status === 'CLOSED') {
    return secureJson({ error: 'Session is closed' }, { status: 409 }, request)
  }

  const db = getTenantClient(auth.schoolId)
  // Optional user-facing marker message when requesting via button (not free-text RULE 5)
  if (session.status === 'AI_MANAGED') {
    await db.chatMessage.create({
      data: {
        sessionId: session.id,
        userId: String(auth.user.id),
        sender: 'USER',
        content: 'Requesting a human administrator.',
      },
    })
  }

  const result = await requestHumanHandoff({
    schoolId: auth.schoolId,
    session,
    role: auth.chatRole,
    tenantName: auth.schoolName,
    userId: String(auth.user.id),
    persistSystemReply: true,
  })

  return NextResponse.json(
    buildHandoffClientPayload({
      sessionId: result.session.id,
      status: result.session.status,
      telegramSent: result.telegramSent,
      telegramReason: result.telegramReason,
    })
  )
})
