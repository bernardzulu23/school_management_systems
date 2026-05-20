export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile, resolveAllocationDepartmentId } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations, isSchoolAdminOrHead } from '@/lib/utils/hodAccess'
import { resolveTeacherRecordId } from '@/lib/utils/resolveTeacherId'

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
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
  const isAdminOrHead = isSchoolAdminOrHead(auth.user)
  if (!canManageDepartmentAllocations(auth.user, hodProfile)) {
    throw new ApiError(
      'Only HOD or school admin can create allocations. Ask your admin to link your Head of Department profile.',
      403
    )
  }
  if (!hodProfile && !isAdminOrHead) {
    throw new ApiError('HOD profile not found for this school', 404)
  }

  const body = await request.json().catch(() => ({}))
  const requestedDepartmentId = normalizeString(body?.departmentId)
  const teacherIdRaw = normalizeString(body?.teacherId)
  const teacherId = await resolveTeacherRecordId(prisma, schoolId, teacherIdRaw)
  const subject = normalizeString(body?.subject)
  const classes = normalizeClasses(body?.classes)
  const periodConfig = body?.periodConfig ?? null
  const term = normalizeString(body?.term) || 'Term 1'
  const academicYear = normalizeString(body?.academicYear) || String(new Date().getFullYear())

  const deptResult = await resolveAllocationDepartmentId({
    prisma,
    schoolId,
    isAdminOrHead,
    hodProfile,
    requestedDepartmentId,
  })
  if (deptResult.error) throw new ApiError(deptResult.error, deptResult.status || 400)
  const departmentId = deptResult.departmentId

  if (!teacherIdRaw) throw new ApiError('teacherId is required', 400)
  if (!teacherId) throw new ApiError('Teacher record not found for this school', 400)
  if (!subject) throw new ApiError('subject is required', 400)
  if (classes.length === 0) throw new ApiError('classes is required', 400)

  const allocation = await prisma.departmentAllocation.create({
    data: {
      schoolId,
      departmentId,
      status: 'DRAFT',
      allocationData: { teacherId, classes, subject, periodConfig, term, academicYear },
      createdByUserId: auth.user.id,
    },
    select: { id: true, status: true },
  })

  return NextResponse.json({ allocationId: allocation.id, status: allocation.status })
})
