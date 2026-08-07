export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { safeStringId } from '@/lib/security/safeQueryValue'
import { SBA_DEFAULT_STARTS_AT_LEVEL } from '@/lib/sba/constants'

const ADMIN_ROLES = ['ADMIN', 'admin', 'headteacher', 'HOD', 'hod']

const COMPONENT_TYPES = new Set([
  'COURSEWORK',
  'PRACTICAL',
  'PROJECT',
  'ORAL',
  'PORTFOLIO',
  'TERM_TEST',
  'OTHER',
])

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const routeParams = typeof params?.then === 'function' ? await params : params
  const id = safeStringId(routeParams?.id)
  if (!id) throw new ApiError('Policy id required', 400)

  const body = await request.json().catch(() => ({}))
  const db = getTenantClient(schoolId)
  const existing = await db.sBASubjectPolicy.findFirst({ where: { id, schoolId } })
  if (!existing) throw new ApiError('Policy not found', 404)

  const data = {}
  if (body.startsAtLevel != null) {
    data.startsAtLevel = String(body.startsAtLevel).trim() || SBA_DEFAULT_STARTS_AT_LEVEL
  }
  if (body.sourceDocument !== undefined) {
    data.sourceDocument = body.sourceDocument == null ? null : String(body.sourceDocument)
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive

  await db.sBASubjectPolicy.update({ where: { id }, data })

  if (Array.isArray(body.components)) {
    for (const c of body.components) {
      const type = String(c.componentType || '').toUpperCase()
      if (!COMPONENT_TYPES.has(type)) {
        throw new ApiError(`Invalid componentType: ${c.componentType}`, 400)
      }
    }
    await db.sBAComponentPolicy.deleteMany({ where: { policyId: id } })
    if (body.components.length > 0) {
      await db.sBAComponentPolicy.createMany({
        data: body.components.map((c, i) => ({
          schoolId,
          policyId: id,
          componentType: String(c.componentType).toUpperCase(),
          maxRawMark:
            c.maxRawMark === null || c.maxRawMark === undefined || c.maxRawMark === ''
              ? null
              : Number(c.maxRawMark),
          weight: Number(c.weight) || 0,
          sortOrder: Number(c.sortOrder) || i,
          label: c.label ? String(c.label) : null,
        })),
      })
    }
  }

  const full = await db.sBASubjectPolicy.findFirst({
    where: { id },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      components: { orderBy: { sortOrder: 'asc' } },
    },
  })

  const weightsSum = (full?.components || []).reduce((s, c) => s + (Number(c.weight) || 0), 0)
  const weightsWarn = (full?.components || []).length > 0 && Math.abs(weightsSum - 1) > 0.001

  return NextResponse.json({
    policy: full,
    weightsSum,
    weightsWarn,
    warning: weightsWarn
      ? 'Component weights do not sum to 1.0 — saved anyway (soft warning).'
      : null,
  })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ADMIN_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const routeParams = typeof params?.then === 'function' ? await params : params
  const id = safeStringId(routeParams?.id)
  if (!id) throw new ApiError('Policy id required', 400)

  const db = getTenantClient(schoolId)
  const existing = await db.sBASubjectPolicy.findFirst({ where: { id, schoolId } })
  if (!existing) throw new ApiError('Policy not found', 404)

  await db.sBASubjectPolicy.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
