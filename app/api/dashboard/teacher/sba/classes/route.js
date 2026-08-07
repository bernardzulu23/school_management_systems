export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'
import { SBA_ENTRY_START_YEAR } from '@/lib/sba/constants'

const TEACHER_ROLES = ['TEACHER', 'teacher', 'ADMIN', 'admin', 'headteacher', 'HOD', 'hod']

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, TEACHER_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const db = getTenantClient(schoolId)
  const teacher = await db.teacher.findFirst({
    where: { userId: auth.user.id, schoolId },
    include: {
      classes: true,
      subjects: true,
      teachingAssignments: {
        where: { schoolId },
        include: { class: true, subject: true },
      },
    },
  })

  const isElevated = roleCheck(auth.user, ['ADMIN', 'admin', 'headteacher', 'HOD', 'hod'])

  let classes = []
  if (teacher) {
    const { classById } = await resolveTeacherLoad({ schoolId, teacher, tx: db })
    classes = Array.from(classById.values())
  } else if (isElevated) {
    classes = await db.class.findMany({
      where: { schoolId, isActive: true },
      orderBy: [{ year_group: 'asc' }, { name: 'asc' }],
    })
  }

  const secondary = classes.filter((c) => {
    const yg = String(c.year_group || '')
    return /form|ss|grade\s*1[0-2]/i.test(yg) || /form/i.test(String(c.name || ''))
  })

  return NextResponse.json({
    classes: secondary.map((c) => ({
      id: c.id,
      name: c.name,
      year_group: c.year_group,
      section: c.section,
    })),
    sbaEntryStartYear: SBA_ENTRY_START_YEAR,
  })
})
