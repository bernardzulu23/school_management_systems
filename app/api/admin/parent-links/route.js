export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import prisma from '@/lib/prisma'
import { createParentInvite, revokeParentLink, PARENT_RELATIONSHIPS } from '@/lib/parent/links'

async function authorizeAdminParentLinks(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This request was blocked for security reasons.' },
        { status: 403 }
      ),
    }
  }
  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  return { ok: true, auth, schoolId: tenant.schoolId }
}

/**
 * Admin: list parent links for a student or school.
 * Query: ?studentId= (optional)
 */
export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeAdminParentLinks(request)
  if (!access.ok) return access.response

  const studentId = new URL(request.url).searchParams.get('studentId')
  const links = await prisma.parentStudentLink.findMany({
    where: {
      schoolId: access.schoolId,
      ...(studentId ? { studentId } : {}),
      status: { in: ['pending', 'active'] },
    },
    include: {
      student: { select: { id: true, name: true, class: true } },
      parentUser: { select: { id: true, email: true, name: true } },
    },
    orderBy: { invitedAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ success: true, links, relationships: PARENT_RELATIONSHIPS })
})

/**
 * Admin: create parent invite.
 * Body: { studentId, relationship, inviteEmail, invitePhone? }
 */
export const POST = withErrorHandler(async function POST(request) {
  const access = await authorizeAdminParentLinks(request)
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  try {
    const link = await createParentInvite({
      schoolId: access.schoolId,
      studentId: body.studentId,
      relationship: body.relationship,
      inviteEmail: body.inviteEmail,
      invitePhone: body.invitePhone,
      invitedByUserId: access.auth.user.id,
    })

    const acceptPath = `/parent/accept?token=${encodeURIComponent(link.inviteToken)}`
    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        status: link.status,
        inviteEmail: link.inviteEmail,
        relationship: link.relationship,
        inviteToken: link.inviteToken,
        acceptPath,
      },
    })
  } catch (e) {
    throw new ApiError(e.message || 'Failed to create invite', 400)
  }
})

/**
 * Admin: revoke a link.
 * Body: { linkId }
 */
export const DELETE = withErrorHandler(async function DELETE(request) {
  const access = await authorizeAdminParentLinks(request)
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const linkId = String(body.linkId || '').trim()
  if (!linkId) throw new ApiError('linkId is required', 400)

  const result = await revokeParentLink(access.schoolId, linkId)
  if (result.count === 0) throw new ApiError('Link not found', 404)

  return NextResponse.json({ success: true })
})
