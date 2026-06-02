import { unstable_cache } from 'next/cache'
import { basePrisma } from '@/lib/prisma/client'

/** ECZ constructs are global reference data (no schoolId on model). */
async function fetchEczConstructs(subjectName) {
  console.log('[CACHE MISS] ecz-constructs', subjectName || 'all')
  return basePrisma.eczSubjectConstruct.findMany({
    where: subjectName ? { subjectName: String(subjectName) } : undefined,
    orderBy: { subjectName: 'asc' },
  })
}

export function getCachedEczConstructs(subjectName = null) {
  const key = subjectName ? String(subjectName) : 'all'
  return unstable_cache(() => fetchEczConstructs(subjectName), ['ecz-constructs', key], {
    tags: ['ecz-constructs'],
    revalidate: 86400,
  })()
}
