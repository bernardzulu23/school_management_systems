export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { authMiddleware } from '@/lib/middleware/auth'
import { isPlatformToken } from '@/lib/middleware/platformAuth'
import {
  resolvePlatformAdminRecord,
  signPlatformToken,
  verifyPlatformAdminPassword,
} from '@/lib/platform/platformAdminAuth'
import prisma from '@/lib/prisma'
import { ACCESS_TOKEN_MAX_AGE, authCookieOptions } from '@/lib/security/cookies'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { passwordPolicyError } from '@/lib/security/passwordPolicy'

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isPlatformToken(auth.user)) {
    return NextResponse.json({ error: 'Not a platform session' }, { status: 403 })
  }

  const record = await resolvePlatformAdminRecord(auth.user)
  if (!record) {
    return NextResponse.json(
      {
        error:
          'Profile is only available for database accounts. Run npm run seed:platform-admin, then sign in again.',
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    profile: {
      id: record.id,
      email: record.email,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  })
})

export const PATCH = withSecureApi(async function PATCH(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isPlatformToken(auth.user)) {
    return NextResponse.json({ error: 'Not a platform session' }, { status: 403 })
  }

  const record = await resolvePlatformAdminRecord(auth.user)
  if (!record) {
    return NextResponse.json(
      {
        error:
          'Profile updates require a database account. Run npm run seed:platform-admin, then sign in again.',
      },
      { status: 400 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const name = body?.name != null ? String(body.name).trim() : undefined
  const email = body?.email != null ? String(body.email).trim().toLowerCase() : undefined
  const currentPassword = String(body?.currentPassword || '')
  const newPassword = body?.newPassword != null ? String(body.newPassword) : undefined

  const changingEmail = email && email !== record.email.toLowerCase()
  const changingPassword = Boolean(newPassword)

  if ((changingEmail || changingPassword) && !currentPassword) {
    return NextResponse.json(
      { error: 'Current password is required to change email or password' },
      { status: 400 }
    )
  }

  if (changingEmail || changingPassword) {
    const valid = await verifyPlatformAdminPassword(record, currentPassword)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }
  }

  if (name !== undefined && name.length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }

  if (changingEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    const taken = await prisma.platformAdmin.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        NOT: { id: record.id },
      },
      select: { id: true },
    })
    if (taken) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 })
    }
  }

  if (changingPassword) {
    const policyError = passwordPolicyError(newPassword)
    if (policyError) {
      return NextResponse.json({ error: policyError, code: 'WEAK_PASSWORD' }, { status: 400 })
    }
  }

  const data = {}
  if (name !== undefined) data.name = name
  if (changingEmail) data.email = email
  if (changingPassword) data.password = await bcrypt.hash(newPassword, 12)

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
  }

  const updated = await prisma.platformAdmin.update({
    where: { id: record.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      updatedAt: true,
    },
  })

  const tokenPayload = {
    id: updated.id,
    email: updated.email,
    name: updated.name,
  }
  const accessToken = signPlatformToken(tokenPayload)

  const response = NextResponse.json({
    success: true,
    message: 'Profile updated',
    profile: updated,
  })

  response.cookies.set(
    'access_token',
    accessToken,
    authCookieOptions(request, { maxAgeSeconds: ACCESS_TOKEN_MAX_AGE, name: 'access_token' })
  )

  return response
})
