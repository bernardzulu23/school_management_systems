export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { WebPushSubscribeSchema } from '@/lib/schemas'
import { upsertWebPushSubscription } from '@/lib/notifications/webPushService'

/** PWA push subscription — same behaviour as POST /api/notifications/web-push/subscribe */
export const POST = withSecureHandler(async function POST(request) {
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
