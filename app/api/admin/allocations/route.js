export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAllocationSeason } from '@/lib/timetable/allocationSeason'

function matchesSeason(allocationData, term, academicYear) {
  const season = resolveAllocationSeason(allocationData, { term, academicYear })
  return season.term === term && season.academicYear === academicYear
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const term = String(searchParams.get('term') || 'Term 1').trim()
  const academicYear = String(searchParams.get('academicYear') || new Date().getFullYear()).trim()
  const status = String(searchParams.get('status') || '')
    .trim()
    .toUpperCase()
  const departmentId = String(searchParams.get('departmentId') || '').trim()

  const rows = await prisma.departmentAllocation.findMany({
    where: {
      schoolId,
      ...(departmentId ? { departmentId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    take: 3000,
  })

  const allocations = rows.filter((row) => matchesSeason(row.allocationData, term, academicYear))

  return NextResponse.json({ success: true, allocations, term, academicYear })
})
