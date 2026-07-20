import { NextResponse } from 'next/server'
import { requireChatAuth } from '@/lib/ai/chat/session'
import { submitLessonPlanToHod } from '@/lib/ai/chat/lesson-plan-submission'
import { roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/lesson-plans/[id]/submit-to-hod
 * Teacher owns submission → PENDING_APPROVAL + hodId via resolveReviewerUserId
 */
export const POST = withErrorHandler(async function POST(
  request: Request,
  { params }: { params: Promise<Record<string, string>> | Record<string, string> }
) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN'])) {
    throw new ApiError('Only the teacher who created the submission can submit it', 403)
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  try {
    const updated = await submitLessonPlanToHod({
      schoolId: auth.schoolId,
      teacherId: String(auth.user.id),
      submissionId: id,
    })
    return NextResponse.json({
      success: true,
      submission: {
        id: updated.id,
        status: updated.status,
        hodId: updated.hodId,
        submittedAt: updated.submittedAt,
      },
      message: 'Submitted to HOD for approval',
    })
  } catch (err) {
    const status = (err as { status?: number })?.status || 500
    throw new ApiError(err instanceof Error ? err.message : 'Submit failed', status)
  }
})
