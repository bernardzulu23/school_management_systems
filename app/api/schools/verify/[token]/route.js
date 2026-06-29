import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

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

export const GET = withSecureHandler(async function GET(request, { params }) {
  const token = await safeRouteParam(params, 'token')

  const now = new Date()
  const school = await prisma.school.findFirst({
    where: {
      verificationToken: token,
      verificationExpiry: { gt: now },
      active: false,
      subdomain: { notIn: BLOCKED_SUBDOMAINS },
    },
    select: { id: true, subdomain: true },
  })

  if (!school) {
    return NextResponse.redirect(new URL('/register-school?error=invalid-token', request.url))
  }

  await prisma.school.update({
    where: { id: school.id },
    data: {
      active: true,
      emailVerified: true,
      verificationToken: null,
      verificationExpiry: null,
    },
  })

  const host = request.headers.get('host') || ''
  const baseDomain =
    process.env.APP_BASE_DOMAIN || getBaseDomain(host) || 'bluepeacktechnologies.com'

  const url = `https://${school.subdomain}.${baseDomain}/login?verified=true`
  return NextResponse.redirect(url)
})
