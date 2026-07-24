/**
 * GET /api/teaching/scheme-test-topics?schemeId=&slot=mid_term|end_of_term
 * Teaching weeks eligible for scheme-based midterm / EoT generation.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { eligibleTopicsForSlot } from '@/lib/teaching/schemeTestTopics'

export const dynamic = 'force-dynamic'

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
  const schemeId = safeQueryString(url.searchParams.get('schemeId'))
  const slotRaw = safeQueryString(url.searchParams.get('slot'), { defaultValue: 'mid_term' })
  const slot = slotRaw === 'end_of_term' ? 'end_of_term' : 'mid_term'

  if (!schemeId) {
    return NextResponse.json({ error: 'schemeId required' }, { status: 400 })
  }

  const scheme = await prisma.schemeOfWork.findFirst({
    where: { id: schemeId, schoolId },
    include: { testSchedule: true },
  })
  if (!scheme) return NextResponse.json({ error: 'Scheme not found' }, { status: 404 })

  const isOwner = scheme.teacherId === String(user.id)
  const isAdmin = roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = eligibleTopicsForSlot({
    weeks: scheme.weeks,
    schedule: scheme.testSchedule,
    slot,
  })

  return NextResponse.json({
    schemeId: scheme.id,
    subject: scheme.subject,
    gradeOrForm: scheme.gradeOrForm,
    term: scheme.term,
    year: scheme.year,
    status: scheme.status,
    slot: result.slot,
    cutoffWeek: result.cutoffWeek,
    topics: result.topics,
    warning: result.warning || null,
    draftWarning:
      scheme.status === 'DRAFT'
        ? 'This scheme is still DRAFT. Prefer a SUBMITTED scheme for formal tests.'
        : null,
  })
})
