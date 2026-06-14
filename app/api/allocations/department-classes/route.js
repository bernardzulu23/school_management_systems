export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile, resolveHodDepartmentIds } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations, isSchoolAdminOrHead } from '@/lib/utils/hodAccess'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'

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
  if (!departmentId) throw new ApiError('departmentId is required', 400)

  if (!isSchoolAdminOrHead(auth.user) && hodProfile) {
    const allowedIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
    if (allowedIds.length > 0 && !allowedIds.includes(departmentId)) {
      throw new ApiError('Department not in your scope', 403)
    }
  }

  const dept = await prisma.department.findFirst({
    where: { id: departmentId, schoolId },
    select: { id: true, name: true },
  })
  if (!dept) throw new ApiError('Department not found', 404)

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      departments: { some: { departmentId } },
    },
    include: {
      teachingAssignments: { include: { class: true } },
      classes: true,
    },
  })

  const classById = new Map()
  for (const t of teachers) {
    for (const a of t.teachingAssignments || []) {
      if (a?.class?.id) classById.set(String(a.class.id), a.class)
    }
    for (const c of t.classes || []) {
      if (c?.id) classById.set(String(c.id), c)
    }
  }

  const classes = Array.from(classById.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  )

  return NextResponse.json({
    success: true,
    department: dept,
    data: classes.map((c) => ({
      id: c.id,
      name: c.name,
      label: c.name || `${c.year_group || ''}${c.section || ''}`.trim(),
    })),
  })
})
