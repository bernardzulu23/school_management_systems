export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateQuery } from '@/lib/middleware/validate-request'
import { MarketplaceQuerySchema } from '@/lib/schemas'
import { toPublicListing } from '@/lib/marketplace'

/**
 * GET /api/marketplace
 *
 * Public browse/search of approved shared materials. No auth required — lets
 * prospective schools browse before signing up. School identity is never
 * exposed (only province). Returns approved materials only.
 */
export const GET = withErrorHandler(async function GET(request) {
  const { data: q, error } = validateQuery(new URL(request.url), MarketplaceQuerySchema, request)
  if (error) return error

  const page = q.page || 1
  const limit = q.limit || 20
  const skip = (page - 1) * limit

  const filters = {}
  if (q.subject) filters.subject = { equals: q.subject, mode: 'insensitive' }
  if (q.form) filters.form = { equals: q.form, mode: 'insensitive' }
  if (q.type) filters.type = q.type
  if (q.resourceLevel) filters.resourceLevel = q.resourceLevel
  if (q.search) {
    filters.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { topic: { contains: q.search, mode: 'insensitive' } },
      { subject: { contains: q.search, mode: 'insensitive' } },
    ]
  }

  const [total, materials] = await Promise.all([
    prisma.sharedMaterial.count({
      where: { schoolId: { not: '' }, status: 'approved', ...filters },
    }),
    prisma.sharedMaterial.findMany({
      where: { schoolId: { not: '' }, status: 'approved', ...filters },
      orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: { teacher: { select: { name: true } } },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      items: materials.map(toPublicListing),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  })
})
