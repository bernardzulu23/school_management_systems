export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  getChronicAbsentees,
  sendChronicAbsenteeAlerts,
  CHRONIC_ABSENCE_THRESHOLD,
} from '@/lib/attendance/sessions'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden: Headteacher access only' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const threshold = Number(searchParams.get('threshold')) || CHRONIC_ABSENCE_THRESHOLD
  const subjectId = searchParams.get('subjectId') || undefined
  const term = searchParams.get('term')
  const academicYear = searchParams.get('academicYear') || undefined

  const students = await getChronicAbsentees({
    schoolId,
    subjectId,
    term: term != null && term !== '' ? term : undefined,
    academicYear,
    threshold,
  })

  return NextResponse.json({
    success: true,
    data: { threshold, students },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden: Headteacher access only' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { searchParams } = new URL(request.url)
  const threshold =
    Number(body.threshold ?? searchParams.get('threshold')) || CHRONIC_ABSENCE_THRESHOLD

  const result = await sendChronicAbsenteeAlerts({
    schoolId,
    subjectId: body.subjectId || searchParams.get('subjectId') || undefined,
    term: body.term ?? searchParams.get('term') ?? undefined,
    academicYear: body.academicYear || searchParams.get('academicYear') || undefined,
    threshold,
    notifyParents: body.notifyParents !== false,
    notifyTeachers: body.notifyTeachers !== false,
  })

  return NextResponse.json({ success: true, data: result })
})
