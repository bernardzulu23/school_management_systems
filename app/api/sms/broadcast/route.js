export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { BroadcastSMSSchema } from '@/lib/schemas'
import { createBroadcast } from '@/lib/sms/broadcast'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Only headteachers and HODs can send bulk SMS broadcasts', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { phoneNumbers, message } = await parseBodyOrThrow(request, BroadcastSMSSchema)

  const result = await createBroadcast({
    schoolId,
    message,
    phoneNumbers,
    createdByUserId: auth.user.id || auth.user.userId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, balance: result.balance },
      { status: result.status || 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      broadcastId: result.broadcastId,
      enqueued: result.enqueued,
      balance: result.balance,
      message: `Enqueued ${result.enqueued} messages for delivery.`,
    },
  })
})
