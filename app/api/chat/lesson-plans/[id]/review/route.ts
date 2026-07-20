import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireChatAuth } from '@/lib/ai/chat/session'
import { reviewLessonPlanSubmission } from '@/lib/ai/chat/lesson-plan-submission'
import { roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  comments: z.string().max(4000).optional().nullable(),
})

/**
 * POST /api/chat/lesson-plans/[id]/review
 * HOD (assigned) or admin: approve / reject PENDING_APPROVAL submissions.
 */
export const POST = withErrorHandler(async function POST(
  request: Request,
  { params }: { params: Promise<Record<string, string>> | Record<string, string> }
) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  const isAdmin = roleCheck(auth.user, [
    'ADMIN',
    'headteacher',
    'DEPUTY',
    'SENIOR_TEACHER',
    'deputyheadteacher',
    'seniorteacher',
  ])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])
  if (!isAdmin && !isHod) {
    throw new ApiError('Only HOD or admin can review submissions', 403)
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const raw = await request.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError(parsed.error.issues[0]?.message || 'Invalid input', 400)
  }

  try {
    const updated = await reviewLessonPlanSubmission({
      schoolId: auth.schoolId,
      reviewerId: String(auth.user.id),
      submissionId: id,
      action: parsed.data.action,
      comments: parsed.data.comments,
      isAdmin,
    })
    return NextResponse.json({
      success: true,
      submission: {
        id: updated.id,
        status: updated.status,
        hodComments: updated.hodComments,
        reviewedAt: updated.reviewedAt,
      },
    })
  } catch (err) {
    const status = (err as { status?: number })?.status || 500
    throw new ApiError(err instanceof Error ? err.message : 'Review failed', status)
  }
})
