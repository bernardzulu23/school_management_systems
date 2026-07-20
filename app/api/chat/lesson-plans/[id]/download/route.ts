import { NextResponse } from 'next/server'
import { requireChatAuth } from '@/lib/ai/chat/session'
import { getSubmissionDownload } from '@/lib/ai/chat/lesson-plan-submission'
import { roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/lesson-plans/[id]/download
 * Returns a signed/expiring R2 URL, or streams the local file (dev fallback).
 * Never returns a permanent public URL.
 */
export const GET = withErrorHandler(async function GET(
  request: Request,
  { params }: { params: Promise<Record<string, string>> | Record<string, string> }
) {
  const auth = await requireChatAuth(request)
  if (!auth.ok) return auth.response

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])

  try {
    const result = await getSubmissionDownload({
      schoolId: auth.schoolId,
      userId: String(auth.user.id),
      submissionId: id,
      isAdmin,
      isHod,
    })

    if (result.signedUrl) {
      return NextResponse.json({
        success: true,
        url: result.signedUrl,
        expiresIn: result.expiresIn,
        filename: result.filename,
        backend: result.backend,
      })
    }

    if (result.buffer) {
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }

    throw new ApiError('File unavailable', 404)
  } catch (err) {
    const status = (err as { status?: number })?.status || 500
    throw new ApiError(err instanceof Error ? err.message : 'Download failed', status)
  }
})
