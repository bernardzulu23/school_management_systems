export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { toPlatformSchoolSummary } from '@/lib/platform/schoolEligibility'
import { withSecureApi } from '@/lib/middleware/secureApi'

/** Patch tenant billing flags only — never expose or modify academic data. */
export const PATCH = withSecureApi(async function PATCH(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const id = String((await params)?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'School id required' }, { status: 400 })

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
      planExpiresAt: true,
      trialEndsAt: true,
      createdAt: true,
      _count: { select: { users: true, students: true, teachers: true } },
    },
  })

  return NextResponse.json({
    school: toPlatformSchoolSummary(school, {
      users: school._count.users,
      students: school._count.students,
      teachers: school._count.teachers,
    }),
  })
})
