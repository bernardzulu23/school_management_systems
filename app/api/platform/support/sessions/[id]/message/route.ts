import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { basePrisma } from '@/lib/prisma/client'
import { broadcastHandoffMessage } from '@/lib/ai/chat/handoff'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
})

/**
 * POST /api/platform/support/sessions/[id]/message
 * Claiming platform admin sends a HUMAN_STAFF message; DO relays to user.
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

  const raw = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return secureJson(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
      request
    )
  }

  const session = await basePrisma.chatSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) throw new ApiError('Session not found', 404)

  if (session.status !== 'HUMAN_ACTIVE' || session.assignedToId !== String(auth.user.id)) {
    return secureJson(
      { error: 'Only the claiming admin can message this session' },
      { status: 403 },
      request
    )
  }

  const content = parsed.data.message.trim()
  const platformAdminId = String(auth.user.id)
  // PlatformAdmin ids are not User rows — ChatMessage.userId FKs to User.
  const msg = await basePrisma.chatMessage.create({
    data: {
      sessionId: session.id,
      schoolId: session.schoolId,
      userId: null,
      sender: 'HUMAN_STAFF',
      content,
      contextSources: {
        platformAdminId,
        platformAdminName:
          String(auth.user.name || '').trim() || String(auth.user.email || '').trim() || null,
      },
    },
  })
  await basePrisma.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  })

  await broadcastHandoffMessage({
    sessionId: session.id,
    messageId: msg.id,
    sender: 'HUMAN_STAFF',
    content,
    userId: platformAdminId,
  })

  return NextResponse.json({
    success: true,
    message: {
      id: msg.id,
      role: 'admin',
      sender: msg.sender,
      content: msg.content,
      createdAt: msg.createdAt,
    },
  })
})
