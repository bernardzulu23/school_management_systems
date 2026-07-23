import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSubscriptionState, hydrateLegacySchoolAccess } from '@/lib/billing/subscription'

const EXEMPT_PREFIXES = [
  '/api/auth/',
  '/api/onboarding/',
  '/api/school/current',
  '/api/billing/',
  '/api/schools/verify/',
  '/api/public/',
  '/api/platform/',
  '/api/ping',
  '/api/health',
  '/api/profile/picture',
  '/api/notifications/web-push/vapid-public-key',
]

function isExemptPath(pathname) {
  return EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
}

function isMissingSchemaError(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '').toLowerCase()
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('table') ||
    message.includes('column')
  )
}

function isDbUnavailableError(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '').toLowerCase()
  return (
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1008' ||
    message.includes("can't reach database server") ||
    message.includes('connection') ||
    message.includes('timed out')
  )
}

/**
 * Blocks API access when school trial/subscription has expired.
 * Returns a NextResponse (402) or null if access is allowed.
 */
export async function enforceSubscriptionIfNeeded(request) {
  let pathname = ''
  try {
    pathname = new URL(request.url).pathname
  } catch {
    return null
  }

  if (!pathname.startsWith('/api/') || isExemptPath(pathname)) {
    return null
  }

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user?.schoolId) {
    return null
  }

  let school
  try {
    school = await prisma.school.findUnique({
      where: { id: String(auth.user.schoolId) },
      select: {
        id: true,
        active: true,
        plan: true,
        planExpiresAt: true,
        trialEndsAt: true,
        createdAt: true,
        emailVerified: true,
        schoolType: true,
      },
    })
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database schema out of date',
          message:
            'Database tables are missing. Run Prisma migrations (prisma migrate deploy) for this environment.',
        },
        { status: 503 }
      )
    }
    if (isDbUnavailableError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database unavailable',
          message: 'Cannot reach the database server. Check DATABASE_URL / network / SSL settings.',
        },
        { status: 503 }
      )
    }
    throw error
  }

  if (!school) return null

  const hydratedSchool = await hydrateLegacySchoolAccess(prisma, school.id, school)

  if (
    !hydratedSchool.emailVerified &&
    String(hydratedSchool.schoolType || '').toUpperCase() === 'INDIVIDUAL'
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Email verification required',
        message: 'Verify your email before using the platform.',
        code: 'EMAIL_NOT_VERIFIED',
      },
      { status: 403 }
    )
  }

  const sub = getSubscriptionState(hydratedSchool)
  if (sub.active) return null

  return NextResponse.json(
    {
      success: false,
      error: 'Subscription required',
      message: sub.isTrialExpired
        ? `Your ${sub.trialDaysTotal}-day free trial has ended. Please upgrade to continue using the platform.`
        : 'Your school subscription has expired. Please renew to restore access.',
      code: 'SUBSCRIPTION_EXPIRED',
      plan: sub.plan,
      expiryDate: sub.expiresAt,
      daysOverdue: sub.daysOverdue,
      billingUrl: '/dashboard/billing',
    },
    { status: 402 }
  )
}
