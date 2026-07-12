export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withSecureHandler } from '@/lib/middleware/secureApi'

/** PWA push subscription — forwards to /api/notifications/web-push/subscribe */
export const POST = withSecureHandler(async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Use POST /api/notifications/web-push/subscribe with a VAPID subscription payload.',
    },
    { status: 410 }
  )
})
