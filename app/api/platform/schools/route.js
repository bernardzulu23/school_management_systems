export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { isAffiliatedPaidSchool, toPlatformSchoolSummary } from '@/lib/platform/schoolEligibility'
import { withSecureApi } from '@/lib/middleware/secureApi'

const SCHOOL_META_SELECT = {
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
}

/** List affiliated, paid schools — metadata only (no enrollment counts). */
export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { searchParams } = new URL(request.url)
  const includeUnpaid = searchParams.get('includeUnpaid') === '1'
  const province = String(searchParams.get('province') || '').trim()
  const district = String(searchParams.get('district') || '').trim()
  const stream = String(searchParams.get('stream') || '').trim()

  const schools = await prisma.school.findMany({
    where: {
      ...(province ? { province: { equals: province, mode: 'insensitive' } } : {}),
      ...(district ? { district: { equals: district, mode: 'insensitive' } } : {}),
      ...(stream ? { reportingStreamKey: stream } : {}),
    },
    select: SCHOOL_META_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  const filtered = (includeUnpaid ? schools : schools.filter(isAffiliatedPaidSchool)).filter(
    (s) => s.active || includeUnpaid
  )

  return NextResponse.json({
    schools: filtered.map((s) => toPlatformSchoolSummary(s)),
    total: filtered.length,
  })
})
