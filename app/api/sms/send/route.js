export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { sendAfricasTalkingSms, pushSmsLog } from '@/lib/sms'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { SendSMSSchema } from '@/lib/schemas'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  // SMS costs money — restrict to staff who legitimately message parents.
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { to, message, from = null } = await parseBodyOrThrow(request, SendSMSSchema)

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
