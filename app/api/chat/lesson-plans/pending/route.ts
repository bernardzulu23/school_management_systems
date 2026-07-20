import { NextResponse } from 'next/server'
import { requireChatAuth } from '@/lib/ai/chat/session'
import { roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/lesson-plans/pending
 * HOD: pending chat lesson-plan submissions for their department (hodId = self).
 * Admin/headteacher: all pending in school.
 */
export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])
  if (!isAdmin && !isHod) {
    throw new ApiError('Only HOD or admin can list pending submissions', 403)
  }

  const db = getTenantClient(auth.schoolId)
  const userId = String(auth.user.id)

  const rows = await db.lessonPlanSubmission.findMany({
    where: {
      schoolId: auth.schoolId,
      status: 'PENDING_APPROVAL',
      ...(isAdmin ? {} : { hodId: userId }),
    },
    orderBy: { submittedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      topic: true,
      subject: true,
      grade: true,
      status: true,
      submittedAt: true,
      teacherId: true,
      teacher: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, submissions: rows })
})
