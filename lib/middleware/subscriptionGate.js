import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSubscriptionState } from '@/lib/billing/subscription'

const EXEMPT_PREFIXES = [
  '/api/auth/',
  '/api/onboarding/',
  '/api/school/current',
  '/api/schools/verify/',
  '/api/public/',
  '/api/platform/',
  '/api/ping',
  '/api/health',
  '/api/profile/picture',
]

function isExemptPath(pathname) {
  return EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
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

  const school = await prisma.school.findUnique({
    where: { id: String(auth.user.schoolId) },
    select: {
      id: true,
      active: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
    },
  })

  if (!school) return null

  const sub = getSubscriptionState(school)
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
