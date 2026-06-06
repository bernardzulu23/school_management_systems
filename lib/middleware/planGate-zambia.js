import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { canUseFeature, planIncludes } from '@/lib/zambiaSchoolFeatures'

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
        level: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found', code: 'SCHOOL_NOT_FOUND' },
        { status: 404 }
      )
    }

    const now = new Date()
    const plan = String(school.plan || 'trial').toLowerCase()
    const level = String(school.level || 'combined').toLowerCase()

    if (plan === 'unpaid') {
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

    const trialEndsAt = school.trialEndsAt ? new Date(school.trialEndsAt) : null
    const planExpiresAt = school.planExpiresAt ? new Date(school.planExpiresAt) : null
    const onTrial = Boolean(trialEndsAt && trialEndsAt.getTime() > now.getTime())
    const onPaid = Boolean(planExpiresAt && planExpiresAt.getTime() > now.getTime())

    const accessActive = plan === 'trial' ? onTrial : onTrial || onPaid

    if (!accessActive) {
      return NextResponse.json(
        {
          error: 'Your plan has expired',
          code: 'PLAN_EXPIRED',
          plan,
          expiryDate: planExpiresAt || trialEndsAt || null,
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

    return null
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
