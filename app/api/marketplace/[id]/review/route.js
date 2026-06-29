export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { ReviewMaterialSchema } from '@/lib/schemas'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

/**
 * POST /api/marketplace/:id/review
 *
 * An HOD/headteacher approves or rejects a marketplace submission from THEIR OWN
 * school. Cross-school review is forbidden (tenant isolation).
 */
export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Invalid material id', 400)

  const body = await parseBodyOrThrow(request, ReviewMaterialSchema)

  // Material must belong to the reviewer's own school.
  const material = await prisma.sharedMaterial.findFirst({
    where: { id, schoolId },
    select: { id: true, status: true },
  })
  if (!material) throw new ApiError('Submission not found', 404)
  if (material.status !== 'pending') {
    throw new ApiError(`Submission already ${material.status}`, 409)
  }

  const updated = await prisma.sharedMaterial.update({
    where: { id: material.id },
    data:
      body.action === 'approve'
        ? {
            status: 'approved',
            approvedBy: String(auth.user.id),
            approvedAt: new Date(),
            rejectionReason: null,
          }
        : {
            status: 'rejected',
            rejectionReason: body.rejectionReason || 'Not suitable for sharing',
          },
    select: { id: true, status: true, approvedAt: true, rejectionReason: true },
  })

  return NextResponse.json({ success: true, data: updated })
})
