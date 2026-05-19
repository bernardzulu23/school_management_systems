export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/middleware/auth'
import { canUseFeature, planIncludes, PRIMARY_ONLY_FEATURES } from '@/lib/zambiaSchoolFeatures'

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ allowed: false, reason: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const featureId = String(body?.featureId || '').trim()
  if (!featureId) {
    return NextResponse.json({ allowed: false, reason: 'featureId required' }, { status: 400 })
  }

  const schoolId = String(user?.schoolId || '').trim()
  if (!schoolId) {
    return NextResponse.json({ allowed: false, reason: 'School context required' }, { status: 400 })
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        plan: true,
        planExpiresAt: true,
        trialEndsAt: true,
        level: true,
      },
    })

    if (!school) {
      return NextResponse.json({ allowed: false, reason: 'School not found' }, { status: 404 })
    }

    const now = new Date()
    const plan = String(school.plan || 'trial').toLowerCase()
    const level = String(school.level || 'combined').toLowerCase()

    const onTrial = Boolean(
      school.trialEndsAt && new Date(school.trialEndsAt).getTime() > now.getTime()
    )
    const isTrialExpired =
      plan === 'trial' &&
      school.trialEndsAt &&
      new Date(school.trialEndsAt).getTime() < now.getTime()
    const isPlanExpired =
      !onTrial &&
      plan !== 'trial' &&
      school.planExpiresAt &&
      new Date(school.planExpiresAt).getTime() < now.getTime()

    if (isTrialExpired || isPlanExpired) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Plan expired',
          code: 'PLAN_EXPIRED',
          requiresUpgrade: true,
          expiryDate: school.planExpiresAt || school.trialEndsAt || null,
        },
        { status: 402 }
      )
    }

    if (!planIncludes(plan, featureId, school)) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Feature requires higher plan',
          code: 'PLAN_UPGRADE_REQUIRED',
          requiresUpgrade: true,
          currentPlan: plan,
          suggestedPlan: plan === 'basic' ? 'standard' : 'premium',
        },
        { status: 403 }
      )
    }

    if (!canUseFeature(level, featureId)) {
      const meta = PRIMARY_ONLY_FEATURES[featureId]
      return NextResponse.json(
        {
          allowed: false,
          reason: 'This feature is only available for primary schools',
          code: 'PRIMARY_ONLY',
          isPrimaryOnly: true,
          featureName: meta?.name || null,
          schoolLevel: level,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      allowed: true,
      plan,
      schoolLevel: level,
      schoolId: school.id,
      schoolName: school.name,
    })
  } catch (error) {
    return NextResponse.json({ allowed: false, reason: 'Internal server error' }, { status: 500 })
  }
}
