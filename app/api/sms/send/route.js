export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { sendAfricasTalkingSms, pushSmsLog } from '@/lib/sms'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
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
