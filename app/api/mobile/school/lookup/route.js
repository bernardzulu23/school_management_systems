export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString } from '@/lib/security/safeQueryValue'

/** Public: validate school subdomain before mobile login */
export const GET = withSecureHandler(async function GET(request) {
  const rateLimitResult = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 30 : 100,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'mobile_school_lookup_',
  })
  if (rateLimitResult.isLimited) return rateLimitResult.response

  const subdomain = safeQueryString(new URL(request.url).searchParams.get('subdomain'), {
    maxLength: 64,
    defaultValue: '',
  }).toLowerCase()

  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json({ valid: false, error: 'Subdomain too short' }, { status: 400 })
  }

  const school = await prisma.school.findFirst({
    where: { subdomain: { equals: subdomain, mode: 'insensitive' }, active: true },
    select: { id: true, name: true, subdomain: true, logo_url: true },
  })

  if (!school) {
    return NextResponse.json({ valid: false, error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json({
    valid: true,
    school: {
      id: school.id,
      name: school.name,
      subdomain: school.subdomain,
      logoUrl: school.logo_url,
    },
  })
})
