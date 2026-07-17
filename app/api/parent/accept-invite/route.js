export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import prisma from '@/lib/prisma'
import { findInviteByToken, normalizeParentEmail } from '@/lib/parent/links'
import { evaluatePassword, weakPasswordLoginPayload } from '@/lib/security/passwordPolicy'

/**
 * Preview a pending parent invite (public — token is the secret).
 */
export const GET = withErrorHandler(async function GET(request) {
  const token = new URL(request.url).searchParams.get('token')
  const invite = await findInviteByToken(token)
  if (!invite) throw new ApiError('Invite not found or already used', 404)

  return NextResponse.json({
    success: true,
    invite: {
      email: invite.inviteEmail,
      relationship: invite.relationship,
      studentName: invite.student?.name,
      studentClass: invite.student?.class,
      schoolName: invite.school?.name,
      schoolSubdomain: invite.school?.subdomain,
    },
  })
})

/**
 * Accept invite: create/login parent user + activate link.
 * Body: { token, password, name? }
 */
export const POST = withErrorHandler(async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const token = String(body.token || '').trim()
  const password = String(body.password || '')
  const name = String(body.name || '').trim()

  const invite = await findInviteByToken(token)
  if (!invite) throw new ApiError('Invite not found or already used', 404)

  if (!evaluatePassword(password).isValid) {
    return NextResponse.json(weakPasswordLoginPayload(), { status: 403 })
  }

  const email = normalizeParentEmail(invite.inviteEmail)
  const schoolId = invite.schoolId
  const hashed = await bcrypt.hash(password, 12)

  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findFirst({
      where: { schoolId, email },
    })

    if (user) {
      if (String(user.role).toLowerCase() !== 'parent') {
        throw new ApiError('An account with this email already exists for another role', 409)
      }
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          ...(name ? { name } : {}),
          contact_number: invite.invitePhone || user.contact_number,
        },
      })
    } else {
      user = await tx.user.create({
        data: {
          email,
          password: hashed,
          name: name || email.split('@')[0] || 'Parent',
          role: 'parent',
          schoolId,
          contact_number: invite.invitePhone || null,
        },
      })
    }

    await tx.parentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        schoolId,
        phone: invite.invitePhone || null,
        preferredContact: 'email',
      },
      update: {
        phone: invite.invitePhone || undefined,
      },
    })

    const conflict = await tx.parentStudentLink.findFirst({
      where: {
        parentUserId: user.id,
        studentId: invite.studentId,
        status: 'active',
        NOT: { id: invite.id },
      },
    })
    if (conflict) {
      throw new ApiError('You are already linked to this student', 409)
    }

    const link = await tx.parentStudentLink.update({
      where: { id: invite.id },
      data: {
        parentUserId: user.id,
        status: 'active',
        verifiedAt: new Date(),
        inviteToken: null,
      },
    })

    return { user, link }
  })

  return NextResponse.json({
    success: true,
    message: 'Invite accepted. You can now log in with your email and password.',
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: 'parent',
      schoolId,
    },
  })
})
