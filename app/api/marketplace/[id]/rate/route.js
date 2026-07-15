export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { RateMaterialSchema } from '@/lib/schemas'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { recomputeMaterialRating } from '@/lib/marketplace'

/**
 * POST /api/marketplace/:id/rate
 *
 * Any authenticated teacher rates an approved material (1-5, one per teacher).
 * Re-rating updates the existing score. The cached average is recomputed.
 */
export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Invalid material id', 400)

  const body = await parseBodyOrThrow(request, RateMaterialSchema)
  const userId = String(auth.user.id)

  const material = await prisma.sharedMaterial.findFirst({
    where: { id, status: 'approved', schoolId: { not: '' } },
    select: { id: true, schoolId: true },
  })
  if (!material) throw new ApiError('Material not found', 404)

  await prisma.materialRating.upsert({
    where: { materialId_teacherId: { materialId: material.id, teacherId: userId } },
    create: {
      materialId: material.id,
      teacherId: userId,
      score: body.score,
      comment: body.comment || null,
      ...(schoolId ? {} : {}),
    },
    update: { score: body.score, comment: body.comment || null },
  })

  await recomputeMaterialRating(prisma, material.id)

  const refreshed = await prisma.sharedMaterial.findFirst({
    where: { id: material.id, schoolId: material.schoolId },
    select: { rating: true, ratingCount: true },
  })

  return NextResponse.json({ success: true, data: refreshed })
})
