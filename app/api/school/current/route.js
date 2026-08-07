export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolvePublicSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getSubscriptionState } from '@/lib/billing/subscription'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { resolveSchoolSectionFlags } from '@/lib/school/resolveSchoolSectionFlags'

export const GET = withSecureHandler(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const explicitSubdomain = safeQueryString(searchParams.get('subdomain'))

  let schoolId = null
  try {
    schoolId = await resolvePublicSchoolId(request, explicitSubdomain)
  } catch {
    return NextResponse.json({ school: null })
  }

  if (!schoolId) {
    return NextResponse.json({ school: null })
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      logo_url: true,
      active: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
      level: true,
      schoolType: true,
      ownershipType: true,
      enabledLocalLanguages: true,
      // Public branding only — never expose enrollmentCode, ownerUserId, email, phone.
    },
  })

  if (!school) {
    return NextResponse.json({ school: null })
  }

  const classes = await prisma.class.findMany({
    where: { schoolId, isActive: true },
    select: { year_group: true, name: true },
    take: 800,
  })
  const sectionFlags = resolveSchoolSectionFlags(school, classes)

  return NextResponse.json({
    school: {
      ...school,
      hasPrimary: sectionFlags.hasPrimary,
      hasSecondary: sectionFlags.hasSecondary,
      subscription: getSubscriptionState(school),
    },
  })
})
