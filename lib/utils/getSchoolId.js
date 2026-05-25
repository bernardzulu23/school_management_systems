import prisma from '@/lib/prisma'

const DEFAULT_OPTIONS = {
  allowClientSchoolIdHeader: false,
  allowDevFirstSchoolFallback: false,
}

/**
 * Resolve schoolId from request host/subdomain (never trust client x-school-id by default).
 */
export async function getSchoolIdFromRequest(request, explicitSubdomain = null, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const headers = request.headers
  const host = String(headers.get('host') || '').toLowerCase()
  const isDev = process.env.NODE_ENV === 'development'

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

  const subdomain =
    explicitSubdomain || headers.get('x-school-subdomain') || getSubdomainFromHost(host)

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
    if (localDevSubdomain) {
      const localDevSchool = await prisma.school.findFirst({
        where: { subdomain: localDevSubdomain, active: true },
        select: { id: true },
      })
      if (localDevSchool) return localDevSchool.id
    }
    return null
  }

  if (subdomain) {
    const cleanSubdomain = subdomain.trim().toLowerCase()
    if (isLocalSubdomain && !explicitSubdomain && !headers.get('x-school-subdomain')) {
      return null
    }

    let school = await prisma.school.findFirst({
      where: {
        subdomain: { equals: cleanSubdomain, mode: 'insensitive' },
        active: true,
      },
      select: { id: true },
    })

    if (school) return school.id

    school = await prisma.school.findFirst({
      where: {
        domain: { contains: cleanSubdomain, mode: 'insensitive' },
        active: true,
      },
      select: { id: true },
    })

    if (school) return school.id

    return null
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

function getSubdomainFromHost(host) {
  if (!host || host.includes('localhost')) return null

  const hostname = host.split(':')[0]
  const parts = hostname.split('.')

  if (parts.length >= 3) {
    if (parts[0] === 'www' && parts.length >= 4) {
      return parts[1]
    }
    return parts[0]
  }

  return null
}
