import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { canUseFeature, planIncludes, canUseFeatureForOwnership } from '@/lib/zambiaSchoolFeatures'
import { getSubscriptionState } from '@/lib/billing/subscription'

export async function requireFeature(schoolId, featureId, options = {}) {
  const safeSchoolId = String(schoolId || '').trim()
  const safeFeatureId = String(featureId || '').trim()
  if (!safeSchoolId || !safeFeatureId) {
    return NextResponse.json(
      { error: 'schoolId and featureId required', code: 'BAD_REQUEST' },
      { status: 400 }
    )
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: safeSchoolId },
      select: {
        id: true,
        plan: true,
        planExpiresAt: true,
        trialEndsAt: true,
        createdAt: true,
        active: true,
        level: true,
        ownershipType: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found', code: 'SCHOOL_NOT_FOUND' },
        { status: 404 }
      )
    }

    const plan = String(school.plan || 'trial').toLowerCase()
    const level = String(school.level || 'combined').toLowerCase()
    const sub = getSubscriptionState(school)

    if (plan === 'unpaid' || school.active === false) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account Inactive',
          message: 'Features are disabled until your subscription is active.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 402 }
      )
    }

    if (sub.expired) {
      return NextResponse.json(
        {
          error: 'Your plan has expired',
          code: 'PLAN_EXPIRED',
          plan,
          expiryDate: sub.expiresAt || school.planExpiresAt || school.trialEndsAt || null,
          context: options?.context || null,
        },
        { status: 402 }
      )
    }

    if (!planIncludes(plan, safeFeatureId, school)) {
      const requiredPlan = plan === 'basic' ? 'standard' : 'premium'
      return NextResponse.json(
        {
          error: 'This feature requires a higher plan',
          code: 'PLAN_UPGRADE_REQUIRED',
          featureId: safeFeatureId,
          plan,
          requiredPlan,
          context: options?.context || null,
        },
        { status: 403 }
      )
    }

    if (!canUseFeature(level, safeFeatureId)) {
      return NextResponse.json(
        {
          error: 'This feature is not available for your school level',
          code: 'SCHOOL_LEVEL_RESTRICTED',
          featureId: safeFeatureId,
          schoolLevel: level,
          context: options?.context || null,
        },
        { status: 403 }
      )
    }

    if (!canUseFeatureForOwnership(school.ownershipType, safeFeatureId)) {
      return NextResponse.json(
        {
          error: 'Fee management is not available for government schools',
          code: 'OWNERSHIP_RESTRICTED',
          featureId: safeFeatureId,
          ownershipType: school.ownershipType || 'PRIVATE',
          context: options?.context || null,
        },
        { status: 403 }
      )
    }

    return null
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
