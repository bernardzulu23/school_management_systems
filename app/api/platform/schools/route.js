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
  planExpiresAt: true,
  trialEndsAt: true,
  createdAt: true,
  _count: {
    select: {
      users: true,
      students: true,
      teachers: true,
    },
  },
}

/** List affiliated, paid schools — metadata and counts only (no school records). */
export const GET = withSecureApi(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { searchParams } = new URL(request.url)
  const includeUnpaid = searchParams.get('includeUnpaid') === '1'

  const schools = await prisma.school.findMany({
    where: { active: true, emailVerified: true },
    select: SCHOOL_META_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  const filtered = includeUnpaid ? schools : schools.filter(isAffiliatedPaidSchool)

  return NextResponse.json({
    schools: filtered.map((s) =>
      toPlatformSchoolSummary(s, {
        users: s._count.users,
        students: s._count.students,
        teachers: s._count.teachers,
      })
    ),
    total: filtered.length,
  })
})
