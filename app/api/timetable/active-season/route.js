export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/middleware/auth'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getDefaultAcademicYear, getDefaultTerm } from '@/lib/timetable/timetableTermOptions'

/**
 * GET /api/timetable/active-season
 * Returns the term/year with the most draft+published periods for this school
 * so overview widgets don't default to an empty/sparse Term 1 while work lives on Term 2.
 */
export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const rows = await prisma.timetableAllocationEntry.groupBy({
    by: ['term', 'academicYear', 'status'],
    where: {
      schoolId,
      status: { in: ['draft', 'published'] },
    },
    _count: { _all: true },
  })

  const scored = new Map()
  for (const row of rows) {
    const term = String(row.term || '').trim()
    const academicYear = String(row.academicYear || '').trim()
    if (!term || !academicYear) continue
    const key = `${term}|${academicYear}`
    const prev = scored.get(key) || {
      term,
      academicYear,
      draft: 0,
      published: 0,
      total: 0,
    }
    const n = Number(row._count?._all || 0)
    if (row.status === 'draft') prev.draft += n
    if (row.status === 'published') prev.published += n
    prev.total += n
    scored.set(key, prev)
  }

  const ranked = [...scored.values()].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    if (b.published !== a.published) return b.published - a.published
    return String(b.academicYear).localeCompare(String(a.academicYear))
  })

  const best = ranked[0] || null

  return NextResponse.json({
    term: best?.term || getDefaultTerm(),
    academicYear: best?.academicYear || getDefaultAcademicYear(),
    draft: best?.draft || 0,
    published: best?.published || 0,
    total: best?.total || 0,
    seasons: ranked,
    source: best ? 'entries' : 'default',
  })
})
