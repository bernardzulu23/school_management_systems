import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { sendAfricasTalkingSms, pushSmsLog } from '@/lib/sms'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const to = body?.to
  const message = body?.message
  const from = body?.from ?? null

  const result = await sendAfricasTalkingSms({ to, message, from })

  pushSmsLog({
    direction: 'out',
    schoolId,
    to: result.recipients,
    message: String(message || ''),
    provider: result.provider,
  })

  return NextResponse.json({ success: true, data: result })
})
