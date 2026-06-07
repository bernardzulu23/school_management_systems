import { unstable_cache } from 'next/cache'
import { basePrisma } from '@/lib/prisma/client'

/**
 * Cached published timetable allocation rows (raw DB shape).
 * API routes still apply role filters on top of this dataset.
 */
async function fetchPublishedEntries(schoolId, term, academicYear) {
  return basePrisma.timetableAllocationEntry.findMany({
    where: {
      schoolId,
      term,
      academicYear,
      status: 'published',
    },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, year_group: true, section: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })
}

export function getCachedPublishedTimetableEntries(schoolId, term, academicYear) {
  const sid = String(schoolId || '')
  const t = String(term || 'Term 1')
  const y = String(academicYear || new Date().getFullYear())
  // v2: TimetableAllocationEntry has no timeSlot relation — sort by periodNumber
  return unstable_cache(() => fetchPublishedEntries(sid, t, y), ['timetable-v2', sid, t, y], {
    tags: ['timetable', `timetable-${sid}`],
    revalidate: 3600,
  })()
}
