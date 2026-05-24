export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { syncDepartmentApprovalToTeacherAllocations } from '@/lib/timetable/departmentApprovalSync'
import { formatPeriodConfigLabel } from '@/lib/timetable/formatPeriodConfig'
import { resolveTeacherUserId } from '@/lib/utils/resolveTeacherId'

function unwrapAllocationData(data) {
  const raw = data && typeof data === 'object' ? data : {}
  const teacherId = String(raw?.teacherId || '').trim()
  const classes = Array.isArray(raw?.classes) ? raw.classes.map((c) => String(c).trim()) : []
  const subject = String(raw?.subject || '').trim()
  const periodConfig = raw?.periodConfig ?? null
  return { teacherId, classes: classes.filter(Boolean), subject, periodConfig }
}

export const POST = withErrorHandler(async function POST(request, { params }) {
  const routeParams = await params
  const allocationId = String(routeParams?.allocationId || '').trim()
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))

  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.departmentAllocation.findFirst({
      where: { id: allocationId, schoolId },
      select: {
        id: true,
        status: true,
        departmentId: true,
        allocationData: true,
        createdByUserId: true,
      },
    })
    if (!allocation) throw new ApiError('Not found', 404)
    if (allocation.status !== 'SUBMITTED') {
      throw new ApiError('Only SUBMITTED allocations can be approved', 400)
    }

    const details = unwrapAllocationData(allocation.allocationData)
    const dataObj =
      allocation.allocationData && typeof allocation.allocationData === 'object'
        ? allocation.allocationData
        : {}
    const term = String(body.term || dataObj.term || 'Term 1').trim()
    const academicYear = String(
      body.academicYear || dataObj.academicYear || new Date().getFullYear()
    ).trim()

    if (!details.teacherId) throw new ApiError('Allocation missing teacherId', 400)
    if (!details.subject) throw new ApiError('Allocation missing subject', 400)
    if (details.classes.length === 0) throw new ApiError('Allocation missing classes', 400)

    const teacherUser = await resolveTeacherUserId(tx, schoolId, details.teacherId)
    if (!teacherUser?.id) {
      throw new ApiError(
        `Teacher not found in this school (id: ${details.teacherId}). Open Class Allocation, re-select the teacher, and resubmit.`,
        400
      )
    }
    const teacherUserId = teacherUser.id

    const periodConfiguration = formatPeriodConfigLabel(details.periodConfig)

    const updated = await tx.departmentAllocation.update({
      where: { id: allocation.id },
      data: {
        status: 'APPROVED',
        approvedByUserId: auth.user.id,
        approvedAt: now,
        rejectionReason: null,
      },
      select: { id: true, status: true, approvedAt: true },
    })

    const masterEntry = await tx.masterTimetableEntry.create({
      data: {
        schoolId,
        departmentId: allocation.departmentId,
        allocationId: allocation.id,
        teacherId: teacherUserId,
        classes: details.classes,
        subject: details.subject,
        periodConfiguration,
      },
      select: { id: true, insertedAt: true },
    })

    await tx.allocationNotification.updateMany({
      where: { schoolId, allocationId: allocation.id, adminUserId: auth.user.id, read: false },
      data: { read: true, readAt: now },
    })

    let timetableSync = { count: 0, teacherAllocationIds: [] }
    try {
      timetableSync = await syncDepartmentApprovalToTeacherAllocations(tx, {
        schoolId,
        departmentAllocationId: allocation.id,
        allocationData: allocation.allocationData,
        teacherUserId,
        hodUserId: allocation.createdByUserId,
        term,
        academicYear,
      })
    } catch (e) {
      const msg = String(e?.message || e || 'Timetable allocation sync failed')
      throw new ApiError(msg, 400)
    }

    return { updated, masterEntry, timetableSync, term, academicYear }
  })

  return NextResponse.json({
    status: result.updated.status,
    insertedAt: result.masterEntry.insertedAt,
    masterEntryId: result.masterEntry.id,
    timetableAllocationsSynced: result.timetableSync.count,
    teacherAllocationIds: result.timetableSync.teacherAllocationIds,
    term: result.term,
    academicYear: result.academicYear,
  })
})
