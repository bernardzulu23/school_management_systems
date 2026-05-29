export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { loginSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { findUserByEmail } from '@/lib/db/queries'
import { resolvePublicSchoolId } from '@/lib/tenant/resolveSchoolId'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { JWT_AUDIENCE } from '@/lib/middleware/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'
const ACCESS_TOKEN_MAX_AGE = 8 * 60 * 60

export const POST = withSecureApi(async function POST(request) {
  try {
    let body = await request.json()
    const { subdomain: subdomainFromBody } = body

    if (subdomainFromBody) {
      const headers = new Headers(request.headers)
      headers.set('x-school-subdomain', subdomainFromBody)
      request = new Request(request, { headers, body: JSON.stringify(body) })
    }

    const validation = await validateRequest(loginSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, password, subdomain } = validation.data
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase()

    const rateLimitResult = rateLimiter(request, {
      limit: process.env.NODE_ENV === 'production' ? 12 : 60,
      windowMs: 5 * 60 * 1000,
      keyPrefix: 'mobile_auth_login_',
      keyGenerator: ({ ip }) => `${ip}-${normalizedEmail}`,
    })
    if (rateLimitResult.isLimited) return rateLimitResult.response

    let schoolId = await resolvePublicSchoolId(request, subdomain)
    if (!schoolId) {
      const matches = await prisma.user.findMany({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
          school: { active: true },
        },
        select: { schoolId: true },
        distinct: ['schoolId'],
        take: 3,
      })
      if (matches.length === 1) schoolId = matches[0].schoolId
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found. Check the subdomain and try again.' },
        { status: 400 }
      )
    }

    let user = await findUserByEmail(schoolId, normalizedEmail)
    if (!user) {
      const emailMatches = await prisma.user.findMany({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
          school: { active: true },
        },
        take: 2,
      })
      if (emailMatches.length === 1) {
        user = emailMatches[0]
        schoolId = user.schoolId
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const role = String(user.role || '').toLowerCase()
    if (role === 'student') {
      return NextResponse.json(
        { error: 'Students cannot use the staff mobile app.' },
        { status: 403 }
      )
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logo_url: true,
        active: true,
      },
    })

    if (!school?.active) {
      return NextResponse.json({ error: 'School is not active' }, { status: 403 })
    }

    const storedHash = String(user.password || '')
    if (!storedHash.startsWith('$2')) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, storedHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '8h', audience: JWT_AUDIENCE }
    )

    const refreshToken = jwt.sign({ id: user.id, schoolId: user.schoolId }, JWT_REFRESH_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    })

    try {
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          schoolId: user.schoolId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    } catch {
      // non-blocking
    }

    const sanitizedUser = sanitizeOutput({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
    })

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_MAX_AGE,
      user: sanitizedUser,
      school: {
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
        logoUrl: school.logo_url,
      },
    })
  } catch (error) {
    console.error('[mobile auth login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
