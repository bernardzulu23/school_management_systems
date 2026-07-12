export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { WebPushSubscribeSchema } from '@/lib/schemas'
import { getVapidPublicKey, upsertWebPushSubscription } from '@/lib/notifications/webPushService'

export const GET = withErrorHandler(async function GET() {
  return NextResponse.json({
    success: true,
    data: { publicKey: getVapidPublicKey() },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response

  const { subscription } = await parseBodyOrThrow(request, WebPushSubscribeSchema)
  const row = await upsertWebPushSubscription({
    userId: auth.user.id,
    schoolId: tenant.schoolId,
    subscription,
  })

  return NextResponse.json({ success: true, data: { id: row.id } }, { status: 201 })
})
