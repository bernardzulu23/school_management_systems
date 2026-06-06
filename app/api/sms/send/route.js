export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { sendAfricasTalkingSms, normalizePhoneNumbers } from '@/lib/sms'
import { createSmsLog } from '@/lib/sms/persistLog'
import { reserveSmsCredits } from '@/lib/sms/balance'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSchoolType } from '@/lib/middleware/individual-gate'
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

  const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
  if (!typeCheck.allowed) return typeCheck.response

  const { to, message, from = null } = await parseBodyOrThrow(request, SendSMSSchema)

  const normalized = normalizePhoneNumbers(to)
  if (!normalized.length) throw new ApiError('No valid Zambian phone numbers', 400)

  const reserve = await reserveSmsCredits(schoolId, normalized.length)
  if (!reserve.ok) {
    throw new ApiError(reserve.reason || 'Insufficient SMS credits', 402)
  }

  const result = await sendAfricasTalkingSms({ to: normalized, message, from })

  if (!result.ok) {
    const { refundSmsCredit } = await import('@/lib/sms/balance')
    await refundSmsCredit(schoolId, normalized.length)
    throw new ApiError('SMS delivery failed', 502)
  }

  for (const phone of result.recipients) {
    await createSmsLog({
      schoolId,
      direction: 'out',
      recipient: phone,
      body: String(message || ''),
      status: 'SENT',
      provider: result.provider,
    })
  }

  return NextResponse.json({ success: true, data: result })
})
