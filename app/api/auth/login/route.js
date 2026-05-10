export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { loginSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { findUserByEmail } from '@/lib/db/queries'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { logAuditAction } from '@/lib/auditLog'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

const PILOT_EMAIL_WHITELIST = new Set(
  (
    process.env.PILOT_EMAILS ||
    'fredith01@gmail.com,admin@ndakedaysecondaryschool.edu,krbmafupa@gmail.com'
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
)

function isPilotEmail(email) {
  return PILOT_EMAIL_WHITELIST.has(
    String(email || '')
      .trim()
      .toLowerCase()
  )
}
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) &&
  !process.env.NEXT_PHASE
) {
  console.warn('Warning: JWT secrets are not set in production environment.')
}

export async function POST(request) {
  try {
    const host = request.headers.get('host') || ''
    const hostName = String(host || '')
      .split(':')[0]
      .toLowerCase()
    const cookieDomain = (() => {
      const configured = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : ''
      if (!configured) return undefined
      if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return undefined
      const normalized = configured.startsWith('.') ? configured.slice(1) : configured
      if (!hostName.endsWith(normalized)) return undefined
      return configured.startsWith('.') ? configured : `.${configured}`
    })()
    let body = await request.json()
    console.log('[Login Debug] Request Body:', { email: body.email }) // Log email only for safety

    const { subdomain: subdomainFromBody } = body
    // If subdomain is in the body, set x-school-subdomain header so getSchoolIdFromRequest finds it
    if (subdomainFromBody) {
      const headers = new Headers(request.headers)
      headers.set('x-school-subdomain', subdomainFromBody)
      request = new Request(request, { headers, body: JSON.stringify(body) })
    }

    // 1. Input Validation
    const validation = await validateRequest(loginSchema, body)
    if (!validation.success) {
      console.log('[Login Debug] Validation Failed:', validation.errors)
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, password, subdomain } = validation.data
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase()
    // Note: 'subdomain' is optional in schema, but passed from frontend if available

    const isProd = process.env.NODE_ENV === 'production'
    const rateLimitResult = rateLimiter(request, {
      limit: isProd ? 12 : 60,
      windowMs: 5 * 60 * 1000,
      keyPrefix: 'auth_login_',
      keyGenerator: ({ ip }) => `${ip}-${normalizedEmail}`,
    })
    if (rateLimitResult.isLimited) return rateLimitResult.response

    // 2. Resolve school for multi-tenant lookup
    let schoolId = await getSchoolIdFromRequest(request, subdomain)
    console.log('[Login Debug] Resolved School ID:', schoolId)

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
      if (matches.length === 1) {
        schoolId = matches[0].schoolId
        console.log('[Login Debug] Inferred School ID (email fallback):', schoolId)
      }
    }

    // For production, strictly require school context for security in multi-tenant setup
    if (!schoolId) {
      console.error(
        'Login error: School context could not be determined. Host:',
        request.headers.get('host')
      )
      return NextResponse.json(
        { error: 'School context could not be determined. Please access via your school URL.' },
        { status: 400 }
      )
    }

    // 3. Database Lookup (Parameterized via Prisma, scoped by schoolId)
    const user = await findUserByEmail(schoolId, normalizedEmail)

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        active: true,
        emailVerified: true,
        plan: true,
        planExpiresAt: true,
        trialEndsAt: true,
      },
    })
    if (!school || school.active === false) {
      return NextResponse.json({ error: 'School is not active' }, { status: 403 })
    }
    if (!school.emailVerified && user.role === 'headteacher' && !isPilotEmail(user.email)) {
      return NextResponse.json(
        { error: 'Please verify your email address first.', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      )
    }

    // 3. Password Verification
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // 4. Token Generation & Cookie Setting (include schoolId for multi-tenant isolation)
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    const newRefreshTokenValue = jwt.sign(
      { id: user.id, schoolId: user.schoolId },
      JWT_REFRESH_SECRET,
      {
        expiresIn: '7d',
      }
    )

    // Save refresh token for rotation tracking.
    // If migrations are temporarily behind, do not block login.
    try {
      await prisma.refreshToken.create({
        data: {
          token: newRefreshTokenValue,
          userId: user.id,
          schoolId: user.schoolId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    } catch (refreshTokenError) {
      console.warn('[Login] Failed to persist refresh token:', refreshTokenError?.message)
    }

    // 5. Sanitize Output
    const sanitizedUser = sanitizeOutput({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      profile_picture_url: user.profile_picture_url,
      department: user?.hodProfile?.department || undefined,
    })

    const response = NextResponse.json({
      success: true,
      user: sanitizedUser,
    })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    response.cookies.set('refresh_token', newRefreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    // Audit the login event
    await logAuditAction({
      userId: user.id,
      schoolId: user.schoolId,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
      request,
    })

    return response
  } catch (error) {
    // 6. Secure Error Handling
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
