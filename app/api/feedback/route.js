import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

/** GET /api/feedback — List feedback (admin/headteacher only) */
export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Only administrators can view feedback' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context could not be determined' }, { status: 400 })
  }

  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { schoolId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ feedbacks })
  } catch (err) {
    console.error('Feedback list error:', err)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}

/** POST /api/feedback — Submit feedback (users only, NOT admin) */
export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  // Admin/headteacher cannot submit feedback
  if (roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Administrators cannot submit feedback' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context could not be determined' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message || message.length < 3) {
    return NextResponse.json(
      { error: 'Feedback message must be at least 3 characters' },
      { status: 400 }
    )
  }

  const category = ['general', 'usability', 'feature', 'bug', 'other'].includes(body.category)
    ? body.category
    : 'general'
  const rating =
    typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? body.rating : null

  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId: auth.user.id,
        schoolId,
        message,
        category,
        rating,
      },
    })
    return NextResponse.json({ success: true, id: feedback.id })
  } catch (err) {
    console.error('Feedback create error:', err)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}
