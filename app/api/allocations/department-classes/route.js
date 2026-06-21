export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile, resolveHodDepartmentIds } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations, isSchoolAdminOrHead } from '@/lib/utils/hodAccess'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'
import { resolveDepartmentClasses } from '@/lib/timetable/resolveDepartmentClasses'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertHodSchoolAccess(schoolId)

  const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
  if (!canManageDepartmentAllocations(auth.user, hodProfile)) {
    throw new ApiError('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const departmentId = String(searchParams.get('departmentId') || '').trim()
  const teacherUserId = String(searchParams.get('teacherUserId') || '').trim()
  if (!departmentId) throw new ApiError('departmentId is required', 400)

  if (!isSchoolAdminOrHead(auth.user) && hodProfile) {
    const allowedIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
    if (allowedIds.length > 0 && !allowedIds.includes(departmentId)) {
      throw new ApiError('Department not in your scope', 403)
    }
  }

  const { department, classes } = await resolveDepartmentClasses(prisma, {
    schoolId,
    departmentId,
    teacherUserId,
  })
  if (!department) throw new ApiError('Department not found', 404)

  return NextResponse.json({
    success: true,
    department,
    data: classes,
  })
})
