import prisma from '@/lib/prisma'
import {
  getAppBaseDomain,
  getSchoolSubdomainFromHost,
  isPlatformReservedSubdomain,
  normalizeSchoolSubdomain,
} from '@/lib/utils/schoolSubdomain'

const DEFAULT_OPTIONS = {
  allowClientSchoolIdHeader: false,
  allowDevFirstSchoolFallback: false,
}

function isPlatformMarketingHost(host) {
  const hostname = String(host || '')
    .split(':')[0]
    .toLowerCase()
    .trim()
  if (!hostname) return false
  const base = getAppBaseDomain()
  return hostname === base || hostname === `www.${base}`
}

async function findSchoolByExactDomain(hostOnly) {
  if (!hostOnly || !hostOnly.includes('.')) return null
  const apex = hostOnly.replace(/^www\./, '')
  return prisma.school.findFirst({
    where: {
      OR: [
        { domain: { equals: hostOnly, mode: 'insensitive' } },
        { domain: { equals: apex, mode: 'insensitive' } },
        { domain: { equals: `www.${apex}`, mode: 'insensitive' } },
      ],
      active: true,
    },
    select: { id: true },
  })
}

/**
 * Resolve schoolId from request host/subdomain (never trust client x-school-id by default).
 */
export async function getSchoolIdFromRequest(request, explicitSubdomain = null, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const headers = request.headers
  const host = String(headers.get('x-forwarded-host') || headers.get('host') || '').toLowerCase()
  const isDev = process.env.NODE_ENV === 'development'
  const hostOnly = host.split(':')[0]
  const onPlatformHost = isPlatformMarketingHost(host)

  if (opts.allowClientSchoolIdHeader) {
    const schoolIdHeader = headers.get('x-school-id')
    if (schoolIdHeader) {
      const school = await prisma.school.findFirst({
        where: { id: schoolIdHeader, active: true },
        select: { id: true },
      })
      if (school) return school.id
    }
  }

  const rawSubdomain =
    explicitSubdomain || headers.get('x-school-subdomain') || getSchoolSubdomainFromHost(host)
  const subdomain = normalizeSchoolSubdomain(rawSubdomain)

  const localSubdomain = String(subdomain || '')
    .trim()
    .toLowerCase()
  const isLocalHost =
    host.includes('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')
  const isLocalSubdomain =
    localSubdomain === 'localhost' ||
    localSubdomain.includes('localhost') ||
    localSubdomain.includes('3000')

  if (isDev && (isLocalHost || isLocalSubdomain) && !subdomain) {
    const localDevSubdomain = String(process.env.LOCAL_DEV_SCHOOL_SUBDOMAIN || '')
      .trim()
      .toLowerCase()
    if (localDevSubdomain && !isPlatformReservedSubdomain(localDevSubdomain)) {
      const localDevSchool = await prisma.school.findFirst({
        where: { subdomain: localDevSubdomain, active: true },
        select: { id: true },
      })
      if (localDevSchool) return localDevSchool.id
    }
    return null
  }

  if (subdomain) {
    if (isLocalSubdomain && !explicitSubdomain && !headers.get('x-school-subdomain')) {
      return null
    }

    const school = await prisma.school.findFirst({
      where: {
        subdomain: { equals: subdomain, mode: 'insensitive' },
        active: true,
      },
      select: { id: true },
    })

    if (school) return school.id

    // Only exact custom-domain match — never substring-match tokens like "www".
    if (!onPlatformHost) {
      const byDomain = await findSchoolByExactDomain(hostOnly)
      if (byDomain) return byDomain.id
    }

    return null
  }

  // No tenant slug on a custom host: exact domain match only (never on platform apex/www).
  if (!onPlatformHost && hostOnly && hostOnly.includes('.') && !isLocalHost) {
    const byDomain = await findSchoolByExactDomain(hostOnly)
    if (byDomain) return byDomain.id
  }

  if (opts.allowDevFirstSchoolFallback && isDev) {
    const firstSchool = await prisma.school.findFirst({
      where: { active: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    return firstSchool?.id ?? null
  }

  return null
}
