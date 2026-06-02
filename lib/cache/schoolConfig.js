import { unstable_cache } from 'next/cache'
import { basePrisma } from '@/lib/prisma/client'

async function fetchSchoolConfig(schoolId) {
  console.log('[CACHE MISS] school-config', schoolId)
  return basePrisma.school.findUnique({
    where: { id: String(schoolId) },
    select: {
      id: true,
      name: true,
      subdomain: true,
      domain: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
      logo_url: true,
      academicYear: true,
      timezone: true,
      active: true,
    },
  })
}

export function getCachedSchoolConfig(schoolId) {
  const id = String(schoolId || '')
  return unstable_cache(() => fetchSchoolConfig(id), ['school-config', id], {
    tags: ['school-config', `school-config-${id}`],
    revalidate: 3600,
  })()
}
