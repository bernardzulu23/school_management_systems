import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { requireChatAuth } from '@/lib/ai/chat/session'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

/** GET /api/chat/sessions — list current user's sessions for this school */
export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  const db = getTenantClient(auth.schoolId)
  const sessions = await db.chatSession.findMany({
    where: { userId: String(auth.user.id) },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      status: true,
      openedAsRole: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ sessions })
})

/** POST /api/chat/sessions — create a new chat session */
export const POST = withErrorHandler(async function POST(request: Request) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  const raw = await request.json().catch(() => ({}))
  const parsed = CreateSessionSchema.safeParse(raw)
  if (!parsed.success) {
    return secureJson(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
      request
    )
  }

  const db = getTenantClient(auth.schoolId)
  const session = await db.chatSession.create({
    data: {
      userId: String(auth.user.id),
      openedAsRole: auth.chatRole,
      title: parsed.data.title || 'New Conversation',
      status: 'AI_MANAGED',
    },
  })

  return NextResponse.json({ session }, { status: 201 })
})
