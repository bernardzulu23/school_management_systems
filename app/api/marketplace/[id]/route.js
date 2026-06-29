export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { toPublicDetail } from '@/lib/marketplace'

/**
 * GET /api/marketplace/:id
 *
 * Public full preview of an approved shared material, with its recent ratings.
 * Pending/rejected materials are treated as not found for the public.
 */
export const GET = withErrorHandler(async function GET(request, { params }) {
  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Invalid material id', 400)

  const material = await prisma.sharedMaterial.findFirst({
    where: { id, status: 'approved' },
    include: {
      teacher: { select: { name: true } },
      ratings: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          score: true,
          comment: true,
          createdAt: true,
          teacher: { select: { name: true } },
        },
      },
    },
  })

  if (!material) throw new ApiError('Material not found', 404)

  const ratings = material.ratings.map((r) => ({
    id: r.id,
    score: r.score,
    comment: r.comment,
    createdAt: r.createdAt,
    author: r.teacher?.name || 'Teacher',
  }))

  return NextResponse.json({
    success: true,
    data: { material: toPublicDetail(material), ratings },
  })
})
