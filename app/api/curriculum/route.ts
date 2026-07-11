import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveCurriculum } from '@/lib/curriculum/resolveCurriculum'

export const dynamic = 'force-dynamic'

/**
 * GET /api/curriculum?subject=&grade=
 */
export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (
    !roleCheck(user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'STUDENT',
      'student',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const { searchParams } = new URL(request.url)
  const subject = String(searchParams.get('subject') || '').trim()
  const grade = String(searchParams.get('grade') || searchParams.get('gradeOrForm') || '').trim()
  const listOnly =
    searchParams.get('list') === '1' || searchParams.get('list') === 'true' || !subject

  if (listOnly && !subject) {
    const { listAvailableCurriculumSubjects } =
      await import('@/lib/curriculum/jsonCurriculumLoader')
    const subjects = listAvailableCurriculumSubjects()
    return NextResponse.json({ success: true, subjects })
  }

  if (!subject) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  }

  const curriculum = await resolveCurriculum({
    schoolId,
    subject,
    gradeOrForm: grade || 'Form 1',
  })

  return NextResponse.json({ success: true, data: curriculum })
})
