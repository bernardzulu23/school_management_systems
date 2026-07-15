export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { loginSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { findUserByEmail } from '@/lib/db/queries'
import { resolvePublicSchoolId } from '@/lib/tenant/resolveSchoolId'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { logAuditAction } from '@/lib/auditLog'
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  REMEMBER_ACCESS_TOKEN_MAX_AGE,
  REMEMBER_REFRESH_TOKEN_MAX_AGE,
  authCookieOptions,
  refreshTokenCookieOptions,
} from '@/lib/security/cookies'
import { setCsrfCookie } from '@/lib/security/csrf'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { JWT_AUDIENCE } from '@/lib/middleware/auth'
import { getSubscriptionState, hydrateLegacySchoolAccess } from '@/lib/billing/subscription'
import { logger, captureError } from '@/lib/utils/logger'
import {
  verifyPlatformAdminCredentials,
  ensurePlatformAdminFromEnv,
  getPlatformLoginHint,
} from '@/lib/platform/platformAdminAuth'
import { buildPlatformLoginResponse } from '@/lib/platform/completePlatformLogin'
import {
  checkLoginBruteForce,
  recordLoginFailure,
  clearLoginFailures,
  getRequestIp,
  handleLoginFailure,
} from '@/lib/security/loginBruteForce'
import { evaluatePassword, weakPasswordLoginPayload } from '@/lib/security/passwordPolicy'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

const PILOT_EMAIL_WHITELIST = new Set(
  String(process.env.PILOT_EMAILS || '')
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
if (process.env.NODE_ENV === 'production' && !process.env.PILOT_EMAILS && !process.env.NEXT_PHASE) {
  console.warn('Warning: PILOT_EMAILS is not set in production environment.')
}

export const POST = withSecureApi(async function POST(request) {
  const route = '/api/auth/login'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  try {
    let body = await request.json()

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
      log.response(400, Date.now() - start)
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, password, subdomain, rememberMe } = validation.data
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase()

    const isProd = process.env.NODE_ENV === 'production'
    const rateLimitResult = rateLimiter(request, {
      limit: isProd ? 5 : 20,
      windowMs: 15 * 60 * 1000,
      keyPrefix: 'auth_login_',
      keyGenerator: ({ ip }) => `${ip}-${normalizedEmail}`,
    })
    if (rateLimitResult.isLimited) return rateLimitResult.response

    const clientIp = getRequestIp(request)
    const globalLock = checkLoginBruteForce({
      request,
      email: normalizedEmail,
      schoolId: 'global',
      ip: clientIp,
    })
    if (globalLock.blocked) return globalLock.response

    await ensurePlatformAdminFromEnv()
    const platformAdmin = await verifyPlatformAdminCredentials(normalizedEmail, password)
    if (platformAdmin) {
      if (!evaluatePassword(password).isValid) {
        return NextResponse.json(weakPasswordLoginPayload(), { status: 403 })
      }
      clearLoginFailures({ email: normalizedEmail, schoolId: 'platform', ip: clientIp })
      log.response(200, Date.now() - start)
      return buildPlatformLoginResponse(request, platformAdmin)
    }

    const platformEmails = new Set(
      (
        process.env.PLATFORM_ADMIN_EMAILS ||
        process.env.PLATFORM_ADMIN_EMAIL ||
        'super-admin@bluepeacktechnologies.com'
      )
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
    if (platformEmails.has(normalizedEmail)) {
      const lock = handleLoginFailure({
        request,
        email: normalizedEmail,
        schoolId: 'platform',
        ip: clientIp,
      })
      if (lock.blocked) return lock.response
      const hint = await getPlatformLoginHint(normalizedEmail)
      return NextResponse.json(
        {
          error: 'Invalid credentials',
          hint: process.env.NODE_ENV === 'production' ? undefined : hint,
        },
        { status: 401 }
      )
    }

    // 2. Resolve school for multi-tenant lookup
    let schoolId = await resolvePublicSchoolId(request, subdomain)

    if (!schoolId) {
      if (process.env.NODE_ENV === 'production') {
        console.error(
          'Login error: School context could not be determined. Host:',
          request.headers.get('host')
        )
        return NextResponse.json(
          {
            error: 'School context could not be determined. Please access via your school URL.',
            code: 'NO_SCHOOL_CONTEXT',
          },
          { status: 400 }
        )
      }

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
      }
    }

    if (!schoolId) {
      console.error(
        'Login error: School context could not be determined. Host:',
        request.headers.get('host')
      )
      return NextResponse.json(
        {
          error: 'School context could not be determined. Please access via your school URL.',
          code: 'NO_SCHOOL_CONTEXT',
        },
        { status: 400 }
      )
    }

    const schoolLock = checkLoginBruteForce({
      request,
      email: normalizedEmail,
      schoolId,
      ip: clientIp,
    })
    if (schoolLock.blocked) return schoolLock.response

    // 3. Database Lookup (scoped by schoolId; fall back to unique email match)
    let user = await findUserByEmail(schoolId, normalizedEmail)

    if (!user && process.env.NODE_ENV !== 'production') {
      const emailMatches = await prisma.user.findMany({
        where: {
          ...(schoolId ? { schoolId } : {}),
          email: { equals: normalizedEmail, mode: 'insensitive' },
          school: { active: true },
        },
        include: {
          studentProfile: true,
          teacherProfile: true,
          hodProfile: true,
        },
        take: 2,
      })
      if (emailMatches.length === 1) {
        user = emailMatches[0]
        schoolId = user.schoolId
      }
    }

    if (!user) {
      const lock = handleLoginFailure({
        request,
        email: normalizedEmail,
        schoolId,
        ip: clientIp,
      })
      if (lock.blocked) return lock.response
      recordLoginFailure({ email: normalizedEmail, schoolId: 'global', ip: clientIp })
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
        createdAt: true,
        schoolType: true,
        level: true,
      },
    })
    if (!school || school.active === false) {
      return NextResponse.json(
        {
          error:
            'School is not active yet. Open the verification link from your registration email, or contact support.',
          code: 'SCHOOL_NOT_ACTIVE',
        },
        { status: 403 }
      )
    }

    const hydratedSchool = await hydrateLegacySchoolAccess(prisma, schoolId, school)
    if (
      !hydratedSchool.emailVerified &&
      (user.role === 'headteacher' ||
        (String(hydratedSchool.schoolType || '').toUpperCase() === 'INDIVIDUAL' &&
          String(user.role || '').toLowerCase() === 'teacher')) &&
      !isPilotEmail(user.email)
    ) {
      return NextResponse.json(
        { error: 'Please verify your email address first.', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      )
    }

    const subscription = getSubscriptionState(hydratedSchool)
    if (subscription.expired && !isPilotEmail(user.email)) {
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: subscription.isTrialExpired
            ? `Your ${subscription.trialDaysTotal}-day free trial has ended. Please upgrade to continue.`
            : 'Your school subscription has expired. Please renew to continue.',
          code: 'SUBSCRIPTION_EXPIRED',
          billingUrl: '/dashboard/billing',
          expiryDate: subscription.expiresAt,
        },
        { status: 402 }
      )
    }

    // 3. Password Verification
    const storedHash = String(user.password || '')
    if (!storedHash.startsWith('$2')) {
      console.error('[Login] User has no valid password hash:', user.id)
      const lock = handleLoginFailure({
        request,
        email: normalizedEmail,
        schoolId,
        ip: clientIp,
      })
      if (lock.blocked) return lock.response
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    let isValid = false
    try {
      isValid = await bcrypt.compare(password, storedHash)
    } catch (compareError) {
      console.error('[Login] bcrypt.compare failed:', compareError?.message)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!isValid) {
      const lock = handleLoginFailure({
        request,
        email: normalizedEmail,
        schoolId,
        ip: clientIp,
      })
      if (lock.blocked) return lock.response
      recordLoginFailure({ email: normalizedEmail, schoolId: 'global', ip: clientIp })
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!evaluatePassword(password).isValid) {
      return NextResponse.json(weakPasswordLoginPayload(), { status: 403 })
    }

    // 4. Token Generation & Cookie Setting (include schoolId for multi-tenant isolation)
    const remember = Boolean(rememberMe)
    const accessMaxAge = remember ? REMEMBER_ACCESS_TOKEN_MAX_AGE : ACCESS_TOKEN_MAX_AGE
    const refreshMaxAge = remember ? REMEMBER_REFRESH_TOKEN_MAX_AGE : REFRESH_TOKEN_MAX_AGE
    const accessExpiresIn = remember ? '30d' : '8h'
    const refreshExpiresIn = remember ? '90d' : '7d'

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: accessExpiresIn, audience: JWT_AUDIENCE }
    )

    const newRefreshTokenValue = jwt.sign(
      { id: user.id, schoolId: user.schoolId },
      JWT_REFRESH_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: refreshExpiresIn,
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
          expiresAt: new Date(Date.now() + refreshMaxAge * 1000),
        },
      })
    } catch (refreshTokenError) {
      console.warn('[Login] Failed to persist refresh token:', refreshTokenError?.message)
    }

    clearLoginFailures({ email: normalizedEmail, schoolId, ip: clientIp })
    clearLoginFailures({ email: normalizedEmail, schoolId: 'global', ip: clientIp })

    // 5. Sanitize Output
    const sanitizedUser = sanitizeOutput({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      schoolType: hydratedSchool?.schoolType || 'SCHOOL',
      schoolLevel: hydratedSchool?.level || 'combined',
      profile_picture_url: user.profile_picture_url,
      department: user?.hodProfile?.department || undefined,
    })

    const response = NextResponse.json({
      success: true,
      user: sanitizedUser,
    })

    response.cookies.set(
      'access_token',
      newAccessToken,
      authCookieOptions(request, { maxAgeSeconds: accessMaxAge, name: 'access_token' })
    )

    response.cookies.set(
      'refresh_token',
      newRefreshTokenValue,
      refreshTokenCookieOptions(request, { maxAgeSeconds: refreshMaxAge })
    )
    setCsrfCookie(response, request)

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

    logger({ route, schoolId: user.schoolId, userId: user.id }).response(200, Date.now() - start)
    return response
  } catch (error) {
    captureError(error, { route })
    log.response(500, Date.now() - start)
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
})
