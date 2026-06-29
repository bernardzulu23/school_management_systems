export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeStringId } from '@/lib/security/safeQueryValue'

const FEEDBACK_CATEGORIES = new Set(['general', 'usability', 'feature', 'bug', 'other'])

/** GET /api/feedback — List feedback (admin/headteacher only) */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Only administrators can view feedback' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context could not be determined' }, { status: 400 })
  }

  const feedbacks = await prisma.feedback.findMany({
    where: { schoolId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ success: true, feedbacks })
})

/** POST /api/feedback — Submit feedback (users only, NOT admin) */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (roleCheck(auth.user, ['ADMIN', 'headteacher', 'administrator', 'admin'])) {
    return NextResponse.json(
      { error: 'Administrators cannot submit feedback through this endpoint' },
      { status: 403 }
    )
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context could not be determined' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : ''
  if (!message || message.length < 3) {
    return NextResponse.json(
      { error: 'Feedback message must be at least 3 characters' },
      { status: 400 }
    )
  }

  const category = FEEDBACK_CATEGORIES.has(body.category) ? body.category : 'general'
  const rating =
    typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? body.rating : null
  const isPublic = body?.isPublic === true

  const feedback = await prisma.feedback.create({
    data: {
      userId: auth.user.id,
      schoolId,
      message,
      category,
      rating,
      isPublic,
    },
  })
  return NextResponse.json({ success: true, id: feedback.id })
})

/** PATCH /api/feedback — Mark feedback public/private (admin/headteacher only) */
export const PATCH = withErrorHandler(async function PATCH(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json(
      { error: 'Only administrators can manage feedback visibility' },
      { status: 403 }
    )
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context could not be determined' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const id = safeStringId(body?.id)
  const isPublic = body?.isPublic === true

  if (!id) return NextResponse.json({ error: 'Feedback id is required' }, { status: 400 })

  const updated = await prisma.feedback.updateMany({
    where: { id, schoolId },
    data: { isPublic },
  })

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
})
