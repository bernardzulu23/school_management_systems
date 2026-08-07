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
const STATUSES = new Set(['DRAFT', 'SUBMITTED', 'LOCKED'])

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
  const status = String(body.status || '')
    .trim()
    .toUpperCase()
  if (!STATUSES.has(status)) {
    throw new ApiError('status must be DRAFT, SUBMITTED, or LOCKED', 400)
  }

  const db = getTenantClient(schoolId)
  const record = await db.sBARecord.findFirst({ where: { id, schoolId } })
  if (!record) throw new ApiError('Record not found', 404)

  if (status === 'LOCKED') {
    const allowed =
      canLockSbaRecords(auth.user.role, LOCK_ROLE_REQUIREMENT) ||
      roleCheck(auth.user, LOCK_ROLE_REQUIREMENT)
    if (!allowed) {
      throw new ApiError(
        'LOCK_ROLE_REQUIREMENT: only HOD / headteacher / admin can lock SBA records',
        403
      )
    }
  }

  // Teachers may move DRAFT ↔ SUBMITTED; unlocking LOCKED requires lock roles
  if (record.status === 'LOCKED' && status !== 'LOCKED') {
    const allowed =
      canLockSbaRecords(auth.user.role, LOCK_ROLE_REQUIREMENT) ||
      roleCheck(auth.user, LOCK_ROLE_REQUIREMENT)
    if (!allowed) {
      throw new ApiError('Only HOD / headteacher / admin can unlock SBA records', 403)
    }
  }

  const data = { status }
  if (status === 'LOCKED') {
    data.lockedAt = new Date()
    data.lockedById = auth.user.id
  } else if (record.status === 'LOCKED') {
    data.lockedAt = null
    data.lockedById = null
  }

  const updated = await db.sBARecord.update({
    where: { id },
    data,
  })

  return NextResponse.json({ record: updated })
})
