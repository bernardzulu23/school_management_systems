export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (
    !roleCheck(auth.user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'student',
      'STUDENT',
    ])
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const { searchParams } = new URL(request.url)
  const subject = safeQueryString(searchParams.get('subject'))
  const subjectCode = safeQueryString(searchParams.get('subjectCode'))
  const formRaw = safeQueryString(searchParams.get('form'))
  const band = safeQueryString(searchParams.get('type') || searchParams.get('band'))

  const where = {}
  if (subjectCode) where.subjectCode = subjectCode
  if (subject) {
    where.subjectName = { contains: subject, mode: 'insensitive' }
  }
  if (formRaw) {
    const form = Number(formRaw)
    if (Number.isFinite(form)) where.form = form
  }
  if (band === 'sba_task' || band === 'exam_scenario') {
    where.band = band
  }

  const rows = await prisma.eczExemplar.findMany({
    ...(schoolId ? {} : {}),
    where,
    orderBy: [{ subjectName: 'asc' }, { form: 'asc' }, { band: 'asc' }, { title: 'asc' }],
    take: 200,
  })

  return NextResponse.json({ success: true, data: rows })
})
