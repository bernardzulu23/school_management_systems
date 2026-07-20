/**
 * Shared auth + session resolution for chat routes.
 */
import { NextResponse } from 'next/server'
import type { ChatSession, ChatUserRole } from '@prisma/client'
import { authMiddleware, type AppUser } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { basePrisma } from '@/lib/prisma/client'
import { isChatRoleEnabled, mapUserToChatRole, rolesMatch } from '@/lib/ai/chat/roles'
import { secureJson } from '@/lib/security/api'

export type ChatAuthOk = {
  ok: true
  user: AppUser
  schoolId: string
  chatRole: ChatUserRole
  schoolName: string
  schoolPlan: string | null
  schoolType: string | null
}

export type ChatAuthFail = {
  ok: false
  response: Response
}

export async function requireChatAuth(request: Request): Promise<ChatAuthOk | ChatAuthFail> {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return { ok: false, response: auth.response as Response }
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response as Response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: secureJson({ error: 'School context required' }, { status: 403 }, request),
    }
  }

  const school = await basePrisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, plan: true, schoolType: true },
  })
  if (!school) {
    return {
      ok: false,
      response: secureJson({ error: 'School not found' }, { status: 404 }, request),
    }
  }

  const chatRole = mapUserToChatRole(auth.user, school.schoolType)
  if (!chatRole || !isChatRoleEnabled(chatRole)) {
    return {
      ok: false,
      response: secureJson(
        {
          error: 'Chat is not enabled for this role',
          code: 'CHAT_ROLE_DISABLED',
          role: chatRole || auth.user.role,
        },
        { status: 403 },
        request
      ),
    }
  }

  return {
    ok: true,
    user: auth.user,
    schoolId,
    chatRole,
    schoolName: school.name,
    schoolPlan: school.plan,
    schoolType: school.schoolType,
  }
}

export function roleMismatchResponse(request: Request, openedAs: ChatUserRole, live: ChatUserRole) {
  return secureJson(
    {
      error: 'Session role mismatch',
      code: 'CHAT_ROLE_MISMATCH',
      message: 'Your role changed since this session was opened. Please start a new session.',
      openedAsRole: openedAs,
      currentRole: live,
    },
    { status: 403 },
    request
  )
}

export async function loadChatSession(params: {
  schoolId: string
  userId: string
  sessionId: string
}): Promise<ChatSession | null> {
  const db = getTenantClient(params.schoolId)
  return db.chatSession.findFirst({
    where: {
      id: params.sessionId,
      userId: params.userId,
    },
  })
}

export async function assertSessionRole(
  request: Request,
  session: ChatSession,
  liveRole: ChatUserRole
): Promise<Response | null> {
  if (!rolesMatch(liveRole, session.openedAsRole)) {
    return roleMismatchResponse(request, session.openedAsRole, liveRole) as Response
  }
  return null
}

export async function getOrCreateSession(params: {
  schoolId: string
  userId: string
  chatRole: ChatUserRole
  sessionId?: string | null
  title?: string | null
}): Promise<ChatSession> {
  const db = getTenantClient(params.schoolId)

  if (params.sessionId) {
    const existing = await db.chatSession.findFirst({
      where: { id: params.sessionId, userId: params.userId },
    })
    if (existing) return existing
  }

  return db.chatSession.create({
    data: {
      userId: params.userId,
      openedAsRole: params.chatRole,
      title: params.title || 'New Conversation',
      status: 'AI_MANAGED',
    },
  })
}
