export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'

/**
 * PATCH /api/ai/term-reports/[id] — HOD approve / publish.
 */
export async function PATCH(request, { params }) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!roleCheck(user, ['hod', 'HOD', 'headteacher', 'ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '').toLowerCase()

  const existing = await prisma.termReport.findFirst({
    where: { id, schoolId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
}
