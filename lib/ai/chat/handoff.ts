/**
 * Shared human-handoff status transitions + Telegram / DO side effects.
 *
 * PILOT STAGE: escalations route to platform admin. Once past single-school
 * pilot, change escalation target to same-tenant Headteacher/HOD — see
 * ZSMS_chatbot_architecture_review.md. This routing choice should not become
 * permanent by default.
 */
import type { ChatSession, SessionStatus } from '@prisma/client'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { basePrisma } from '@/lib/prisma/client'
import {
  buildAdminConsoleSessionUrl,
  sendTelegramHandoffAlert,
} from '@/lib/ai/chat/telegram-handoff'
import { chatDoHttpBaseUrl } from '@/lib/ai/chat/ws-ticket'
import { HUMAN_HANDOFF_REPLY } from '@/lib/ai/chat/system-prompt'

export { HUMAN_HANDOFF_REPLY }

export const HANDOFF_STATUSES: SessionStatus[] = ['PENDING_HUMAN', 'HUMAN_ACTIVE']

export function isHandoffStatus(status: SessionStatus | string): boolean {
  return status === 'PENDING_HUMAN' || status === 'HUMAN_ACTIVE'
}

async function notifyDurableObject(path: string, body: Record<string, unknown>): Promise<void> {
  const base = chatDoHttpBaseUrl()
  const secret = String(process.env.CHAT_DO_SHARED_SECRET || '').trim()
  if (!base || !secret) {
    console.info('[chat-handoff] Durable Object not configured — skipping', path)
    return
  }
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.warn('[chat-handoff] DO notify failed', path, res.status)
    }
  } catch (err) {
    console.warn('[chat-handoff] DO notify error', path, err)
  }
}

/**
 * Transition session → PENDING_HUMAN and fire metadata-only Telegram alert.
 * Idempotent if already PENDING_HUMAN / HUMAN_ACTIVE / CLOSED (CLOSED stays closed).
 */
export async function requestHumanHandoff(params: {
  schoolId: string
  session: ChatSession
  role: string
  tenantName: string
  userId: string
  persistSystemReply?: boolean
}): Promise<{ session: ChatSession; telegramSent: boolean }> {
  const db = getTenantClient(params.schoolId)

  if (params.session.status === 'CLOSED') {
    return { session: params.session, telegramSent: false }
  }

  if (params.session.status === 'HUMAN_ACTIVE') {
    return { session: params.session, telegramSent: false }
  }

  const alreadyPending = params.session.status === 'PENDING_HUMAN'

  let session = params.session
  if (!alreadyPending) {
    session = await db.chatSession.update({
      where: { id: params.session.id },
      data: { status: 'PENDING_HUMAN' },
    })
  }

  if (params.persistSystemReply !== false && !alreadyPending) {
    await db.chatMessage.create({
      data: {
        sessionId: session.id,
        userId: params.userId,
        sender: 'SYSTEM',
        content: HUMAN_HANDOFF_REPLY,
        contextSources: { handoff: true },
      },
    })
  }

  const adminConsoleUrl = buildAdminConsoleSessionUrl(session.id)
  const tg = await sendTelegramHandoffAlert({
    tenantName: params.tenantName,
    role: params.role,
    sessionId: session.id,
    schoolId: params.schoolId,
    adminConsoleUrl,
  })

  await notifyDurableObject('/internal/status', {
    sessionId: session.id,
    status: 'PENDING_HUMAN',
  })

  return { session, telegramSent: tg.sent }
}

/**
 * Platform-admin claim: PENDING_HUMAN → HUMAN_ACTIVE + assignedToId.
 * Caller must have already verified platform_admin.
 */
export async function claimHandoffSession(params: {
  sessionId: string
  adminUserId: string
}): Promise<{ ok: true; session: ChatSession } | { ok: false; status: number; error: string }> {
  const session = await basePrisma.chatSession.findUnique({
    where: { id: params.sessionId },
  })
  if (!session) return { ok: false, status: 404, error: 'Session not found' }
  if (session.status === 'CLOSED') {
    return { ok: false, status: 409, error: 'Session is closed' }
  }
  if (session.status === 'HUMAN_ACTIVE' && session.assignedToId === params.adminUserId) {
    return { ok: true, session }
  }
  if (session.status === 'HUMAN_ACTIVE' && session.assignedToId !== params.adminUserId) {
    return { ok: false, status: 409, error: 'Session already claimed by another admin' }
  }
  if (session.status !== 'PENDING_HUMAN') {
    return { ok: false, status: 409, error: 'Session is not awaiting human handoff' }
  }

  const updated = await basePrisma.chatSession.update({
    where: { id: session.id },
    data: {
      status: 'HUMAN_ACTIVE',
      assignedToId: params.adminUserId,
    },
  })

  await basePrisma.chatMessage.create({
    data: {
      sessionId: updated.id,
      schoolId: updated.schoolId,
      userId: params.adminUserId,
      sender: 'SYSTEM',
      content: 'An administrator has joined this conversation.',
      contextSources: { handoffClaim: true },
    },
  })

  // Server-side claim notification — DO accepts this admin's WS only after this call.
  await notifyDurableObject('/internal/claim', {
    sessionId: updated.id,
    adminUserId: params.adminUserId,
    status: 'HUMAN_ACTIVE',
  })

  return { ok: true, session: updated }
}

export async function closeHandoffSession(params: {
  sessionId: string
  actorUserId: string
}): Promise<{ ok: true; session: ChatSession } | { ok: false; status: number; error: string }> {
  const session = await basePrisma.chatSession.findUnique({
    where: { id: params.sessionId },
  })
  if (!session) return { ok: false, status: 404, error: 'Session not found' }
  if (session.status === 'CLOSED') return { ok: true, session }

  const updated = await basePrisma.chatSession.update({
    where: { id: session.id },
    data: { status: 'CLOSED' },
  })

  await basePrisma.chatMessage.create({
    data: {
      sessionId: updated.id,
      schoolId: updated.schoolId,
      userId: params.actorUserId,
      sender: 'SYSTEM',
      content: 'This support conversation has been closed.',
      contextSources: { handoffClose: true },
    },
  })

  await notifyDurableObject('/internal/status', {
    sessionId: updated.id,
    status: 'CLOSED',
  })

  return { ok: true, session: updated }
}

export async function broadcastHandoffMessage(params: {
  sessionId: string
  messageId: string
  sender: string
  content: string
  userId?: string | null
}): Promise<void> {
  await notifyDurableObject('/internal/broadcast', {
    sessionId: params.sessionId,
    message: {
      id: params.messageId,
      sender: params.sender,
      content: params.content,
      userId: params.userId || null,
      at: new Date().toISOString(),
    },
  })
}
