export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { clearDepartmentAllocations } from '@/lib/timetable/clearDepartmentAllocations'
import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'

export const DELETE = withErrorHandler(async function DELETE(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const term = String(body?.term || 'Term 1').trim()
  const academicYear = String(body?.academicYear || new Date().getFullYear()).trim()
  const departmentId = body?.departmentId ? String(body.departmentId).trim() : null
  const confirm = body?.confirm === true

  if (!confirm) {
    throw new ApiError('Set confirm: true to clear department allocations.', 400)
  }

  const includeSyncedTeacherAllocations = body?.includeSyncedTeacherAllocations !== false
  const includeDraftTimetable = body?.includeDraftTimetable === true

  const result = await prisma.$transaction(async (tx) =>
    clearDepartmentAllocations(tx, {
      schoolId,
      term,
      academicYear,
      departmentId,
      includeSyncedTeacherAllocations,
      includeDraftTimetable,
    })
  )

  if (includeDraftTimetable) {
    await rescanAndPersistDraftMeta(prisma, {
      schoolId,
      term: result.term,
      academicYear: result.academicYear,
    })
  }

  return NextResponse.json({ success: true, ...result })
})
