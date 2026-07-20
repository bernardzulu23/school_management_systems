import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { requireChatAuth } from '@/lib/ai/chat/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/sessions/[id]
 * Load own session + recent messages (used by Phase 4 resubmit reopen).
 */
export const GET = withErrorHandler(async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  const params = await Promise.resolve(context.params)
  const sessionId = String(params?.id || '').trim()
  if (!sessionId) throw new ApiError('Session id required', 400)

  const db = getTenantClient(auth.schoolId)
  const session = await db.chatSession.findFirst({
    where: {
      id: sessionId,
      schoolId: auth.schoolId,
      userId: String(auth.user.id),
    },
    select: {
      id: true,
      title: true,
      status: true,
      openedAsRole: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!session) throw new ApiError('Session not found', 404)

  const messages = await db.chatMessage.findMany({
    where: { sessionId: session.id, schoolId: auth.schoolId },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      sender: true,
      content: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    session,
    messages: messages.map(
      (m: { id: string; sender: string; content: string; createdAt: Date }) => ({
        id: m.id,
        role:
          m.sender === 'USER'
            ? 'user'
            : m.sender === 'HUMAN_STAFF'
              ? 'admin'
              : m.sender === 'SYSTEM'
                ? 'system'
                : 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      })
    ),
  })
})
