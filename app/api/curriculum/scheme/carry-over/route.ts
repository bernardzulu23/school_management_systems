import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { loadCarryOverCandidates } from '@/lib/curriculum/schemeCarryOver'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  subject: z.string().min(1),
  grade: z.string().min(1),
  term: z.string().default('Term 1'),
  year: z.coerce.number().int().min(2020).max(2100),
})

/**
 * GET /api/curriculum/scheme/carry-over?subject=&grade=&term=&year=
 * Lists unfinished teaching topics from the previous term's saved scheme.
 */
export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const url = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    subject: url.searchParams.get('subject'),
    grade: url.searchParams.get('grade') || url.searchParams.get('gradeOrForm'),
    term: url.searchParams.get('term') || 'Term 1',
    year: url.searchParams.get('year') || String(new Date().getFullYear()),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'subject, grade, term, and year are required', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await loadCarryOverCandidates({
    schoolId,
    teacherId: String(user.id),
    subject: parsed.data.subject,
    gradeOrForm: parsed.data.grade,
    term: parsed.data.term,
    year: parsed.data.year,
  })

  return NextResponse.json({ success: true, ...result })
})
