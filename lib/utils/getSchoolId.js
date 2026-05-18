import prisma from '@/lib/prisma'

/**
 * Resolve schoolId from request for multi-tenant data isolation.
 * Priority: 1) x-school-id header, 2) subdomain lookup, 3) first school (single-tenant fallback)
 */
export async function getSchoolIdFromRequest(request, explicitSubdomain = null) {
  const headers = request.headers
  const host = String(headers.get('host') || '').toLowerCase()
  const isDev = process.env.NODE_ENV === 'development'

  // 1. Explicit school ID header (set by middleware or client)
  const schoolIdHeader = headers.get('x-school-id')
  if (schoolIdHeader) {
    const school = await prisma.school.findFirst({
      where: { id: schoolIdHeader, active: true },
      select: { id: true },
    })
    if (school) return school.id
  }

  // 2. Subdomain lookup (Priority: explicit argument -> x-school-subdomain header -> host extraction)
  const subdomain =
    explicitSubdomain || headers.get('x-school-subdomain') || getSubdomainFromHost(host)

  // Local development fallback: use any active school when no real subdomain is available
  // or when localhost was passed through headers as the subdomain.
  const localSubdomain = String(subdomain || '')
    .trim()
    .toLowerCase()
  const isLocalHost =
    host.includes('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')
  const isLocalSubdomain =
    localSubdomain === 'localhost' ||
    localSubdomain.includes('localhost') ||
    localSubdomain.includes('3000')

  if (isDev && (isLocalHost || isLocalSubdomain)) {
    const localDevSubdomain = String(process.env.LOCAL_DEV_SCHOOL_SUBDOMAIN || 'local-dev')
      .trim()
      .toLowerCase()

    const localDevSchool = await prisma.school.findFirst({
      where: { subdomain: localDevSubdomain, active: true },
      select: { id: true },
    })
    if (localDevSchool) return localDevSchool.id

    const devSchool = await prisma.school.findFirst({
      where: { active: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    return devSchool?.id ?? null
  }

  if (subdomain) {
    const cleanSubdomain = subdomain.trim().toLowerCase()

    // Try exact subdomain match first
    let school = await prisma.school.findFirst({
      where: {
        subdomain: {
          equals: cleanSubdomain,
          mode: 'insensitive',
        },
        active: true,
      },
      select: { id: true },
    })

    if (school) {
      return school.id
    }

    // If not found, try searching in the full domain field (partial match)
    school = await prisma.school.findFirst({
      where: {
        domain: {
          contains: cleanSubdomain,
          mode: 'insensitive',
        },
        active: true,
      },
      select: { id: true },
    })

    if (school) {
      return school.id
    }

    return null
  }

  // 3. Single-tenant fallback: first active school (for dev/single-school deployments)
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const firstSchool = await prisma.school.findFirst({
    where: { active: true },
    select: { id: true },
  })

  return firstSchool?.id ?? null
}

function getSubdomainFromHost(host) {
  if (!host || host.includes('localhost')) return null

  // Remove port if present
  const hostname = host.split(':')[0]
  const parts = hostname.split('.')

  // Example: school.domain.com -> school
  // Example: www.school.domain.com -> school
  if (parts.length >= 3) {
    if (parts[0] === 'www' && parts.length >= 4) {
      return parts[1]
    }
    return parts[0]
  }

  return null
}
