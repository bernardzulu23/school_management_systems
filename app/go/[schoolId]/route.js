import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const BLOCKED_SUBDOMAINS = [
  'demo',
  'test',
  'staging',
  'zsms',
  'demoschool',
  'demointernationalschool',
  'demohighschool',
]

function getBaseDomain(host) {
  const hostName = String(host || '')
    .split(':')[0]
    .toLowerCase()
  if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return null
  const parts = hostName.split('.').filter(Boolean)
  if (parts.length < 2) return null
  return parts.slice(-2).join('.')
}

export async function GET(request, { params }) {
  const routeParams = await params
  const schoolId = String(routeParams?.schoolId || '').trim()
  if (!schoolId) {
    return NextResponse.redirect(new URL('/register-school', request.url))
  }

  const school = await prisma.school.findFirst({
    where: {
      id: schoolId,
      active: true,
      isPubliclyListed: true,
      subdomain: { notIn: BLOCKED_SUBDOMAINS },
      NOT: [
        { name: { contains: 'test', mode: 'insensitive' } },
        { name: { contains: 'demo', mode: 'insensitive' } },
        { name: { contains: 'zambian school management system', mode: 'insensitive' } },
      ],
    },
    select: { subdomain: true },
  })

  if (!school?.subdomain) {
    return NextResponse.redirect(new URL('/register-school', request.url))
  }

  const host = request.headers.get('host') || ''
  const baseDomain =
    process.env.APP_BASE_DOMAIN || getBaseDomain(host) || 'bluepeacktechnologies.com'

  const url = `https://${school.subdomain}.${baseDomain}/login`
  return NextResponse.redirect(url)
}
