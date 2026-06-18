import { cache } from 'react'
import { basePrisma } from '@/lib/prisma/client'
import { getSchoolFeatures } from '@/lib/school/schoolTypeHelpers'

/**
 * Cached server-side school context for React Server Components.
 */
export const getSchoolContext = cache(async (schoolId) => {
  if (!schoolId) return null

  const school = await basePrisma.school.findUnique({
    where: { id: String(schoolId) },
    select: {
      id: true,
      name: true,
      level: true,
      ownershipType: true,
      schoolType: true,
      subdomain: true,
      logo_url: true,
    },
  })

  if (!school) return null

  return {
    school,
    features: getSchoolFeatures(school),
  }
})
