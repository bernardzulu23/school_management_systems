import prisma from '@/lib/prisma'

/**
 * Resolve schoolId from request for multi-tenant data isolation.
 * Priority: 1) x-school-id header, 2) subdomain lookup, 3) first school (single-tenant fallback)
 */
export async function getSchoolIdFromRequest(request, explicitSubdomain = null) {
  const headers = request.headers

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
    explicitSubdomain ||
    headers.get('x-school-subdomain') ||
    getSubdomainFromHost(headers.get('host'))

  // DEBUG LOG requested by user
  console.log('DEBUG:', {
    explicitSubdomain,
    xSchoolHeader: headers.get('x-school-subdomain'),
    host: headers.get('host'),
    extractedSubdomain: getSubdomainFromHost(headers.get('host')),
    finalSubdomain: subdomain,
  })

  if (subdomain) {
    const cleanSubdomain = subdomain.trim().toLowerCase()

    // Debug: Log the search attempt
    console.log(
      `[getSchoolId] Searching for school with subdomain: "${cleanSubdomain}" AND active: true`
    )

    // Try exact subdomain match first
    let school = await prisma.school.findFirst({
      where: {
        subdomain: {
          equals: cleanSubdomain,
          mode: 'insensitive',
        },
        // Removed active: true check for debugging
      },
      select: { id: true },
    })

    if (school) {
      console.log(
        `[getSchoolId] Found school by subdomain: "${cleanSubdomain}" -> ID: ${school.id}`
      )
      return school.id
    }

    // If not found, try searching in the full domain field (partial match)
    console.log(`[getSchoolId] Subdomain match failed. Trying domain contains: "${cleanSubdomain}"`)

    school = await prisma.school.findFirst({
      where: {
        domain: {
          contains: cleanSubdomain,
          mode: 'insensitive',
        },
        // Removed active: true check for debugging
      },
      select: { id: true },
    })

    if (school) {
      console.log(`[getSchoolId] Found school by domain: "${cleanSubdomain}" -> ID: ${school.id}`)
      return school.id
    } else {
      console.warn(
        `[getSchoolId] No active school found for subdomain: "${cleanSubdomain}". (Checked subdomain and domain fields)`
      )
    }
  }

  // 3. Single-tenant fallback: first active school (for dev/single-school deployments)
  const firstSchool = await prisma.school.findFirst({
    where: { active: true },
    select: { id: true },
  })

  if (firstSchool) {
    console.log('Using fallback school ID:', firstSchool.id)
  } else {
    console.error('No schools found in database.')
  }

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
