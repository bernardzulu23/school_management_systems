import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { basePrisma } from '@/lib/prisma/client'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/platform/support/queue
 *
 * List ChatSession where status = PENDING_HUMAN, order by updatedAt.
 *
 * PILOT STAGE: escalations route to platform admin. Once past single-school
 * pilot, change escalation target to same-tenant Headteacher/HOD — see
 * ZSMS_chatbot_architecture_review.md. This routing choice should not become
 * permanent by default.
 */
export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return auth.response as Response
  }
  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return secureJson({ error: gate.error }, { status: gate.status }, request)
  }

  const sessions = await basePrisma.chatSession.findMany({
    where: { status: 'PENDING_HUMAN' },
    orderBy: { updatedAt: 'asc' },
    take: 100,
    select: {
      id: true,
      schoolId: true,
      userId: true,
      openedAsRole: true,
      status: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      school: { select: { id: true, name: true, subdomain: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  return NextResponse.json({
    success: true,
    sessions: sessions.map((s) => ({
      id: s.id,
      schoolId: s.schoolId,
      schoolName: s.school?.name || 'Unknown',
      subdomain: s.school?.subdomain || null,
      userId: s.userId,
      userName: s.user?.name || null,
      userEmail: s.user?.email || null,
      openedAsRole: s.openedAsRole,
      status: s.status,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  })
})
