import prisma from '@/lib/prisma'

/**
 * Resolve schoolId from request for multi-tenant data isolation.
 * Priority: 1) x-school-id header, 2) subdomain lookup, 3) first school (single-tenant fallback)
 */
export async function getSchoolIdFromRequest(request) {
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

  // 2. Subdomain lookup (e.g., demo.school.com -> demo)
  const subdomain = headers.get('x-school-subdomain') || getSubdomainFromHost(headers.get('host'))
  console.log('Resolving school for subdomain:', subdomain, 'Host:', headers.get('host'))

  if (subdomain) {
    const school = await prisma.school.findFirst({
      where: { subdomain, active: true },
      select: { id: true },
    })
    if (school) {
      console.log('School found for subdomain:', subdomain, 'ID:', school.id)
      return school.id
    } else {
      console.warn('No active school found for subdomain:', subdomain)
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
  const parts = host.split('.')
  return parts.length > 2 ? parts[0] : null
}
