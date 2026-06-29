export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeAiRoute } from '@/lib/ai/routeAuth'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

/**
 * PATCH /api/ai/term-reports/[id] — HOD approve / publish.
 */
export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const access = await authorizeAiRoute(request, {
    roles: ['hod', 'HOD', 'headteacher', 'ADMIN'],
    rateLimitPrefix: 'ai_term_reports_patch_',
  })
  if (!access.ok) return access.response

  const { schoolId, user } = access
  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Report id is required', 400)

  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '').toLowerCase()

  const existing = await prisma.termReport.findFirst({
    where: { id, schoolId },
  })
  if (!existing) throw new ApiError('Not found', 404)

  let status = existing.status
  let reviewedAt = existing.reviewedAt
  let publishedAt = existing.publishedAt

  if (action === 'approve') {
    status = 'APPROVED'
    reviewedAt = new Date()
  } else if (action === 'publish') {
    status = 'PUBLISHED'
    reviewedAt = reviewedAt || new Date()
    publishedAt = new Date()
  } else if (action === 'reject') {
    status = 'DRAFT'
  } else {
    throw new ApiError('Invalid action', 400)
  }

  const updated = await prisma.termReport.update({
    where: { id },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt,
      publishedAt,
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
