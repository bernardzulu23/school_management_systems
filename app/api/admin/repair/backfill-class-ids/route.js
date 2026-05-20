export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function classKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function isTruthyString(value) {
  return Boolean(String(value || '').trim())
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const dryRun = Boolean(body?.dryRun)

  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, year_group: true, section: true },
    take: 5000,
  })

  const classByKey = new Map()
  const classNameById = new Map()

  for (const c of classes) {
    classNameById.set(String(c.id), String(c.name || '').trim())

    const section = String(c.section || '')
      .trim()
      .toUpperCase()
    const yearGroup = String(c.year_group || '').trim()
    const name = String(c.name || '').trim()

    const candidates = [
      name,
      c.id,
      yearGroup,
      `${yearGroup}${section}`.trim(),
      `${yearGroup} ${section}`.trim(),
      String(name).replace(/\s+/g, ''),
    ].filter(isTruthyString)

    const gradeMatch = yearGroup.match(/^Grade\s*(\d{1,2})/i)
    if (gradeMatch && section) {
      candidates.push(`${Number(gradeMatch[1])}${section}`)
      candidates.push(`Grade ${Number(gradeMatch[1])}${section}`)
    }

    const formMatch = yearGroup.match(/^Form\s*(\d{1,2})/i)
    if (formMatch && section) {
      candidates.push(`${Number(formMatch[1])}${section}`)
      candidates.push(`Form ${Number(formMatch[1])}${section}`)
    }

    for (const k of candidates) {
      const key = classKey(k)
      if (!classByKey.has(key)) classByKey.set(key, { id: String(c.id), name })
    }
  }

  async function backfillModel({ model, idField, label }) {
    const distinct = await prisma[model].findMany({
      where: { schoolId, classId: null },
      select: { class: true },
      distinct: ['class'],
      take: 10000,
    })

    let updated = 0
    let unmatched = 0

    for (const row of distinct) {
      const raw = String(row.class || '').trim()
      if (!raw) continue
      const match = classByKey.get(classKey(raw))
      if (!match?.id) {
        unmatched += 1
        continue
      }

      if (!dryRun) {
        const canonicalName = classNameById.get(String(match.id)) || match.name
        const res = await prisma[model].updateMany({
          where: { schoolId, classId: null, class: raw },
          data: { classId: String(match.id), class: canonicalName || raw },
        })
        updated += res.count
      }
    }

    return { label, updated: dryRun ? 0 : updated, unmatchedDistinctValues: unmatched }
  }

  const [studentsRes, assignmentsRes, assessmentsRes] = await Promise.all([
    backfillModel({ model: 'student', idField: 'id', label: 'students' }),
    backfillModel({ model: 'assignment', idField: 'id', label: 'assignments' }),
    backfillModel({ model: 'assessment', idField: 'id', label: 'assessments' }),
  ])

  return NextResponse.json({
    success: true,
    dryRun,
    classesLoaded: classes.length,
    results: {
      students: studentsRes,
      assignments: assignmentsRes,
      assessments: assessmentsRes,
    },
  })
})
