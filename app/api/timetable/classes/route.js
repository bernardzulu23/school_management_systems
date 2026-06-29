export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile, resolveHodDepartmentIds } from '@/lib/utils/hodDepartmentScope'
import { isSchoolAdminOrHead } from '@/lib/utils/hodAccess'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { resolveDepartmentClasses } from '@/lib/timetable/resolveDepartmentClasses'
import { getActiveClasses } from '@/lib/timetable/getActiveClasses'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const CLASS_LIST_LIMIT = 500

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(request.url)
  const departmentId = safeQueryString(searchParams.get('departmentId'), { defaultValue: '' })
  const teacherUserId = safeQueryString(searchParams.get('teacherUserId'), { defaultValue: '' })
  const activeOnly =
    safeQueryString(searchParams.get('activeOnly'), { defaultValue: 'true' }).toLowerCase() !==
    'false'
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
  })

  if (departmentId) {
    const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
    if (hodProfile && !isSchoolAdminOrHead(auth.user)) {
      const allowedIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
      if (allowedIds.length > 0 && !allowedIds.includes(departmentId)) {
        throw new ApiError('Department not in your scope', 403)
      }
    }

    const { classes } = await resolveDepartmentClasses(prisma, {
      schoolId,
      departmentId,
      teacherUserId,
    })
    return NextResponse.json({ success: true, data: classes })
  }

  const classes = activeOnly
    ? await getActiveClasses(prisma, schoolId, { term, academicYear })
    : await prisma.class.findMany({
        where: { schoolId },
        include: { department: { select: { id: true, name: true, code: true } } },
        orderBy: [{ year_group: 'asc' }, { name: 'asc' }],
        take: CLASS_LIST_LIMIT,
      })

  return NextResponse.json({
    success: true,
    data: classes.map((c) => ({
      id: c.id,
      name: c.name,
      classId: c.name,
      form: c.year_group || '',
      year_group: c.year_group || '',
      section: c.section || '',
      isActive: c.isActive !== false,
      studentCount: c._count?.students ?? 0,
      departmentId: c.departmentId || null,
      department: c.department || null,
      label: c.name,
      gradeLabel: c.name,
    })),
  })
})
