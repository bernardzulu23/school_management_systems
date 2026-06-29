export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import {
  canUseFeature,
  canUseFeatureForOwnership,
  planIncludes,
  PRIMARY_ONLY_FEATURES,
  resolveOwnershipFeatureId,
  SECONDARY_ONLY_FEATURES,
} from '@/lib/zambiaSchoolFeatures'

const PRIVATE_OWNERSHIP_FEATURES = new Set([
  'fee-management',
  'parent-portal',
  'proprietor-dashboard',
  'sibling-discounts',
])

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ allowed: false, reason: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const featureId = safeQueryString(body?.featureId, { maxLength: 128 })
  if (!featureId) {
    return NextResponse.json({ allowed: false, reason: 'featureId required' }, { status: 400 })
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
      level: true,
      ownershipType: true,
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
    plan === 'trial' && school.trialEndsAt && new Date(school.trialEndsAt).getTime() < now.getTime()
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
    if (level === 'primary' && SECONDARY_ONLY_FEATURES[featureId]) {
      const meta = SECONDARY_ONLY_FEATURES[featureId]
      return NextResponse.json(
        {
          allowed: false,
          reason:
            'This feature is not available for primary schools (ECE–Grade 7). Use CBC continuous assessment instead.',
          code: 'SECONDARY_ONLY',
          isSecondaryOnly: true,
          featureName: meta?.name || null,
          schoolLevel: level,
        },
        { status: 403 }
      )
    }

    const meta = PRIMARY_ONLY_FEATURES[featureId]
    if (level === 'secondary' && meta) {
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

    return NextResponse.json(
      {
        allowed: false,
        reason: 'This feature is not available for your school level',
        code: 'SCHOOL_LEVEL_RESTRICTED',
        schoolLevel: level,
      },
      { status: 403 }
    )
  }

  if (!canUseFeatureForOwnership(school.ownershipType, featureId)) {
    const resolved = resolveOwnershipFeatureId(featureId)
    const reason = PRIVATE_OWNERSHIP_FEATURES.has(resolved)
      ? 'This feature is not available for government schools.'
      : 'This feature is only available for government schools.'
    return NextResponse.json(
      {
        allowed: false,
        reason,
        code: 'OWNERSHIP_GATE',
        ownershipType: school.ownershipType,
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
})
