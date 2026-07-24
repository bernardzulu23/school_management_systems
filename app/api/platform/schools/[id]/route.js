export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { toPlatformSchoolSummary } from '@/lib/platform/schoolEligibility'
import { validateSchoolLocation } from '@/lib/platform/reportingStream'
import { deleteSchoolAndData } from '@/lib/platform/deleteSchool'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

const INDIVIDUAL_PLANS = [
  'individual',
  'individual_premium',
  'individual_annual',
  'individual_free',
]
const SCHOOL_PLANS = ['trial', 'basic', 'standard', 'premium']

/** Patch tenant billing flags and location metadata only. */
export const PATCH = withSecureHandler(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'School id required' }, { status: 400 })

  const existing = await prisma.school.findUnique({
    where: { id },
    select: {
      province: true,
      district: true,
      plan: true,
      trialEndsAt: true,
      planExpiresAt: true,
      createdAt: true,
      active: true,
    },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data = {}

  if (typeof body.active === 'boolean') data.active = body.active
  if (body.plan != null) {
    const plan = String(body.plan).trim().toLowerCase()
    if (![...SCHOOL_PLANS, ...INDIVIDUAL_PLANS].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    data.plan = plan
  }
  if (body.planExpiresAt !== undefined) {
    data.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null
  }
  if (body.trialEndsAt !== undefined) {
    data.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null
  }

  // Super-admin only: extend onboarding / pilot trial by 1–12 months.
  if (body.extendPilotMonths != null) {
    const months = Math.floor(Number(body.extendPilotMonths))
    if (!Number.isFinite(months) || months < 1 || months > 12) {
      return NextResponse.json(
        { error: 'extendPilotMonths must be an integer from 1 to 12' },
        { status: 400 }
      )
    }
    const { computeExtendedPilotEndsAt } = await import('@/lib/billing/subscription')
    const nextTrialEnd = computeExtendedPilotEndsAt(existing, months)
    data.trialEndsAt = nextTrialEnd
    // Pilot extensions always put the school back on an active trial track so
    // feature gates and dashboard layouts unlock (not only trialEndsAt).
    data.plan = 'trial'
    data.active = true
    // Clear stale paid expiry so AI/plan gates that still inspect planExpiresAt
    // cannot treat the school as expired after a pilot extension.
    data.planExpiresAt = null
  }

  const nextProvince = body.province !== undefined ? body.province : existing.province
  const nextDistrict = body.district !== undefined ? body.district : existing.district

  if (body.province !== undefined || body.district !== undefined) {
    const location = validateSchoolLocation({
      province: nextProvince,
      district: nextDistrict,
    })
    if (!location.ok) {
      return NextResponse.json({ error: location.error }, { status: 400 })
    }
    data.province = location.province
    data.district = location.district
    data.reportingStreamKey = location.reportingStreamKey
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 })
  }

  const school = await prisma.school.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      subdomain: true,
      plan: true,
      level: true,
      active: true,
      emailVerified: true,
      province: true,
      district: true,
      reportingStreamKey: true,
      planExpiresAt: true,
      trialEndsAt: true,
      createdAt: true,
      schoolType: true,
    },
  })

  try {
    const { revalidateTag } = await import('next/cache')
    revalidateTag(`school-config-${id}`)
    revalidateTag('school-config')
  } catch {
    /* cache tag optional outside Next request lifecycle */
  }

  return NextResponse.json({
    school: toPlatformSchoolSummary(school),
  })
})

/** Permanently delete a school or individual workspace and all tenant data. */
export const DELETE = withSecureHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'School id required' }, { status: 400 })

  const result = await deleteSchoolAndData(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    deleted: result.deleted,
  })
})
