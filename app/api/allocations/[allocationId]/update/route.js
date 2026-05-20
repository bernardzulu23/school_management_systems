export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations } from '@/lib/utils/hodAccess'
import { resolveTeacherRecordId } from '@/lib/utils/resolveTeacherId'

function normalizeString(v) {
  return String(v || '').trim()
}

function normalizeClasses(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  const raw = String(v || '').trim()
  if (!raw) return null
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const routeParams = await params
  const allocationId = String(routeParams?.allocationId || '').trim()
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
  if (!canManageDepartmentAllocations(auth.user, hodProfile)) {
    throw new ApiError('Forbidden', 403)
  }

  const allocation = await prisma.departmentAllocation.findFirst({
    where: { id: allocationId, schoolId },
    select: { id: true, status: true, createdByUserId: true, allocationData: true },
  })
  if (!allocation) throw new ApiError('Not found', 404)
  if (allocation.createdByUserId !== auth.user.id) throw new ApiError('Forbidden', 403)
  if (allocation.status !== 'DRAFT' && allocation.status !== 'REJECTED') {
    throw new ApiError('Only DRAFT or REJECTED allocations can be updated', 400)
  }

  const body = await request.json().catch(() => ({}))

  const nextTeacherIdRaw = normalizeString(body?.teacherId)
  let nextTeacherId = ''
  if (nextTeacherIdRaw) {
    nextTeacherId = (await resolveTeacherRecordId(prisma, schoolId, nextTeacherIdRaw)) || ''
    if (!nextTeacherId) throw new ApiError('Teacher record not found for this school', 400)
  }
  const nextSubject = normalizeString(body?.subject)
  const nextClasses = normalizeClasses(body?.classes)
  const nextPeriodConfig = Object.prototype.hasOwnProperty.call(body || {}, 'periodConfig')
    ? (body?.periodConfig ?? null)
    : undefined

  const current =
    allocation.allocationData && typeof allocation.allocationData === 'object'
      ? allocation.allocationData
      : {}

  const nextTerm = normalizeString(body?.term)
  const nextYear = normalizeString(body?.academicYear)

  const merged = {
    ...current,
    ...(nextTeacherId ? { teacherId: nextTeacherId } : {}),
    ...(nextSubject ? { subject: nextSubject } : {}),
    ...(Array.isArray(nextClasses) ? { classes: nextClasses } : {}),
    ...(nextPeriodConfig !== undefined ? { periodConfig: nextPeriodConfig } : {}),
    ...(nextTerm ? { term: nextTerm } : {}),
    ...(nextYear ? { academicYear: nextYear } : {}),
  }

  const updated = await prisma.departmentAllocation.update({
    where: { id: allocation.id },
    data: { allocationData: merged },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      approvedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  return NextResponse.json({ success: true, allocation: updated })
})
