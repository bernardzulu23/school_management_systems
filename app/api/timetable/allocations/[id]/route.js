// app/api/timetable/allocations/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { idString } from '@/lib/schemas'

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

  const rawId = await safeRouteParam(params, 'id')
  const parsedId = idString.safeParse(rawId)
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid allocation id' }, { status: 400 })
  }
  const id = parsedId.data

  const isHod = roleCheck(auth.user, ['HOD', 'hod']) || Boolean(hasHodProfile)

  const existing = await prisma.teacherAllocation.findFirst({
    where: {
      schoolId,
      id,
      ...(isHod && !roleCheck(auth.user, ['ADMIN', 'headteacher']) ? { hodId: auth.user.id } : {}),
    },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }

  const publishedCount = await prisma.timetableAllocationEntry.count({
    where: { schoolId, allocationId: existing.id, status: 'published' },
  })
  if (publishedCount > 0) {
    return NextResponse.json(
      {
        error:
          'This allocation still has published timetable periods. Clear or regenerate those periods before deleting the allocation.',
        code: 'ALLOCATION_HAS_PUBLISHED_ENTRIES',
        publishedCount,
      },
      { status: 409 }
    )
  }

  await prisma.timetableAllocationEntry.deleteMany({
    where: { schoolId, allocationId: existing.id, status: 'draft' },
  })

  const result = await prisma.teacherAllocation.deleteMany({
    where: {
      schoolId,
      id,
      ...(isHod && !roleCheck(auth.user, ['ADMIN', 'headteacher']) ? { hodId: auth.user.id } : {}),
    },
  })
  if (result.count === 0) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
})
