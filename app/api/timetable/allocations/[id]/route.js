// app/api/timetable/allocations/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const DELETE = withErrorHandler(async function DELETE(req, { params }) {
  const auth = await authMiddleware(req)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(req, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const isAllowedRole = roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!isAllowedRole && !hasHodProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid allocation id' }, { status: 400 })

  const isHod = roleCheck(auth.user, ['HOD', 'hod']) || Boolean(hasHodProfile)
  const where = {
    id,
    schoolId,
    ...(isHod && !roleCheck(auth.user, ['ADMIN', 'headteacher']) ? { hodId: auth.user.id } : {}),
  }

  const result = await prisma.teacherAllocation.deleteMany({ where })
  if (result.count === 0) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
})
