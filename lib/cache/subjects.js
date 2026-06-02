import { unstable_cache } from 'next/cache'
import { basePrisma } from '@/lib/prisma/client'

async function fetchSubjects(schoolId) {
  return basePrisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  })
}

export function getCachedSubjects(schoolId) {
  const id = String(schoolId || '')
  return unstable_cache(() => fetchSubjects(id), ['subjects', id], {
    tags: ['subjects', `subjects-${id}`],
    revalidate: 86400,
  })()
}
