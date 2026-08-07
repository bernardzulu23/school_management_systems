export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { safeStringId } from '@/lib/security/safeQueryValue'
import { LOCK_ROLE_REQUIREMENT } from '@/lib/sba/constants'
import { canLockSbaRecords } from '@/lib/sba/resolveSecondarySBASubjects'

const TEACHER_ROLES = ['TEACHER', 'teacher', 'ADMIN', 'admin', 'headteacher', 'HOD', 'hod']

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, TEACHER_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const routeParams = typeof params?.then === 'function' ? await params : params
  const id = safeStringId(routeParams?.id)
  if (!id) throw new ApiError('Record id required', 400)

  const body = await request.json().catch(() => ({}))
  const rawMark =
    body.rawMark === null || body.rawMark === undefined || body.rawMark === ''
      ? null
      : Number(body.rawMark)
  const reason = String(body.reason || '').trim()

  if (rawMark != null && (!Number.isFinite(rawMark) || rawMark < 0)) {
    throw new ApiError('rawMark must be a non-negative number', 400)
  }

  const db = getTenantClient(schoolId)
  const record = await db.sBARecord.findFirst({ where: { id, schoolId } })
  if (!record) throw new ApiError('Record not found', 404)

  if (record.maxRawMark != null && rawMark != null && rawMark > record.maxRawMark) {
    throw new ApiError('rawMark cannot exceed maxRawMark', 400)
  }

  if (record.status === 'DRAFT' || record.status === 'SUBMITTED') {
    const updated = await db.sBARecord.update({
      where: { id },
      data: {
        rawMark,
        enteredById: auth.user.id,
        status: 'DRAFT',
      },
    })
    return NextResponse.json({ record: updated })
  }

  // LOCKED — requires reason + audit trail; lock roles or elevated can edit
  if (record.status === 'LOCKED') {
    if (!reason) {
      throw new ApiError('reason is required to edit a locked SBA record', 400)
    }
    const canEditLocked =
      canLockSbaRecords(auth.user.role, LOCK_ROLE_REQUIREMENT) ||
      roleCheck(auth.user, LOCK_ROLE_REQUIREMENT)
    if (!canEditLocked) {
      throw new ApiError('Only HOD / headteacher / admin can edit locked records', 403)
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.sBARecordEdit.create({
        data: {
          schoolId,
          recordId: id,
          editedById: auth.user.id,
          previousMark: record.rawMark,
          newMark: rawMark,
          reason,
        },
      })
      return tx.sBARecord.update({
        where: { id },
        data: {
          rawMark,
          enteredById: auth.user.id,
        },
        include: {
          edits: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { editedBy: { select: { id: true, name: true } } },
          },
        },
      })
    })

    return NextResponse.json({ record: updated })
  }

  throw new ApiError('Unsupported record status', 400)
})
