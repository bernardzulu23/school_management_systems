export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { toPlatformSchoolSummary } from '@/lib/platform/schoolEligibility'
import { validateSchoolLocation } from '@/lib/platform/reportingStream'
import { withSecureApi } from '@/lib/middleware/secureApi'

/** Patch tenant billing flags and location metadata only. */
export const PATCH = withSecureApi(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const id = String((await params)?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'School id required' }, { status: 400 })

  const existing = await prisma.school.findUnique({
    where: { id },
    select: { province: true, district: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data = {}

  if (typeof body.active === 'boolean') data.active = body.active
  if (body.plan != null) {
    const plan = String(body.plan).trim().toLowerCase()
    if (!['trial', 'basic', 'standard', 'premium'].includes(plan)) {
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
    },
  })

  return NextResponse.json({
    school: toPlatformSchoolSummary(school),
  })
})
