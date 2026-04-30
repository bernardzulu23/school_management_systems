export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

function normalizeString(v) {
  return String(v || '').trim()
}

function normalizeClasses(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  const raw = String(v || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { departmentId: true, department: true },
  })
  if (!hodProfile) throw new ApiError('HOD profile not found', 404)

  const body = await request.json().catch(() => ({}))
  const departmentId = normalizeString(body?.departmentId)
  const teacherId = normalizeString(body?.teacherId)
  const subject = normalizeString(body?.subject)
  const classes = normalizeClasses(body?.classes)
  const periodConfig = body?.periodConfig ?? null

  if (!departmentId) throw new ApiError('departmentId is required', 400)
  if (!teacherId) throw new ApiError('teacherId is required', 400)
  if (!subject) throw new ApiError('subject is required', 400)
  if (classes.length === 0) throw new ApiError('classes is required', 400)

  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.department,
  })
  if (!resolved.departmentIds.includes(departmentId)) {
    throw new ApiError('You can only create allocations for your department', 403)
  }

  const allocation = await prisma.departmentAllocation.create({
    data: {
      schoolId,
      departmentId,
      status: 'DRAFT',
      allocationData: { teacherId, classes, subject, periodConfig },
      createdByUserId: auth.user.id,
    },
    select: { id: true, status: true },
  })

  return NextResponse.json({ allocationId: allocation.id, status: allocation.status })
})
