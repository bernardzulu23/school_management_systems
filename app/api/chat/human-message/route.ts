import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { requireChatAuth, loadChatSession, assertSessionRole } from '@/lib/ai/chat/session'
import { broadcastHandoffMessage } from '@/lib/ai/chat/handoff'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(8000),
})

/**
 * POST /api/chat/human-message
 * User message during HUMAN_ACTIVE (persisted + relayed via DO). No AI.
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

  if (session.status !== 'HUMAN_ACTIVE') {
    return secureJson(
      { error: 'Human messaging only when an administrator is active', code: 'NOT_HUMAN_ACTIVE' },
      { status: 409 },
      request
    )
  }

  const db = getTenantClient(auth.schoolId)
  const content = parsed.data.message.trim()
  const msg = await db.chatMessage.create({
    data: {
      sessionId: session.id,
      userId: String(auth.user.id),
      sender: 'USER',
      content,
    },
  })
  await db.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  })

  await broadcastHandoffMessage({
    sessionId: session.id,
    messageId: msg.id,
    sender: 'USER',
    content,
    userId: String(auth.user.id),
  })

  return NextResponse.json({
    success: true,
    message: {
      id: msg.id,
      role: 'user',
      content: msg.content,
      createdAt: msg.createdAt,
    },
  })
})
