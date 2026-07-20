import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { basePrisma } from '@/lib/prisma/client'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/platform/support/sessions/[id]
 * Full transcript for platform admin (content is read here — never in Telegram).
 */
export const GET = withErrorHandler(async function GET(
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

  const session = await basePrisma.chatSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      schoolId: true,
      userId: true,
      openedAsRole: true,
      status: true,
      assignedToId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      school: { select: { id: true, name: true, subdomain: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  })

  if (!session) throw new ApiError('Session not found', 404)

  const messages = await basePrisma.chatMessage.findMany({
    where: { sessionId: session.id, schoolId: session.schoolId },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: {
      id: true,
      sender: true,
      content: true,
      userId: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      schoolId: session.schoolId,
      schoolName: session.school?.name || 'Unknown',
      subdomain: session.school?.subdomain || null,
      userId: session.userId,
      userName: session.user?.name || null,
      userEmail: session.user?.email || null,
      openedAsRole: session.openedAsRole,
      status: session.status,
      assignedToId: session.assignedToId,
      assignedToName: session.assignedTo?.name || null,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      role:
        m.sender === 'USER'
          ? 'user'
          : m.sender === 'HUMAN_STAFF'
            ? 'admin'
            : m.sender === 'SYSTEM'
              ? 'system'
              : 'assistant',
      content: m.content,
      userId: m.userId,
      createdAt: m.createdAt,
    })),
  })
})
