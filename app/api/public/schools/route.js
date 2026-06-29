export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const BLOCKED_SUBDOMAINS = [
  'demo',
  'test',
  'staging',
  'zsms',
  'demoschool',
  'demointernationalschool',
  'demohighschool',
]

export const GET = withSecureHandler(async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = safeQueryString(searchParams.get('q')) || ''

    const where = {
      active: true,
      isPubliclyListed: true,
      ...(q
        ? {
            name: { contains: q, mode: 'insensitive' },
          }
        : {}),
      NOT: [
        { subdomain: { in: BLOCKED_SUBDOMAINS } },
        { name: { contains: 'test', mode: 'insensitive' } },
        { name: { contains: 'demo', mode: 'insensitive' } },
        { name: { contains: 'zambian school management system', mode: 'insensitive' } },
      ],
    }

    const schools = await prisma.school.findMany({
      where,
      select: {
        id: true,
        name: true,
        subdomain: true,
        logo_url: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ schools })
  } catch (error) {
    return NextResponse.json({ schools: [] }, { status: 200 })
  }
})
