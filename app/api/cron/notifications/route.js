export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { runNotificationCronJobs } from '@/lib/cron/notificationCron'

/**
 * GET /api/cron/notifications — due scheduled sends, class/test scans, retries, cleanup.
 * Auth: Authorization: Bearer $CRON_SECRET  or  x-cron-secret: $CRON_SECRET
 */
export const GET = withErrorHandler(async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = request.headers.get('x-cron-secret')
  const envSecret = String(process.env.CRON_SECRET || '').trim()

  const isValid =
    Boolean(envSecret) && (authHeader === `Bearer ${envSecret}` || cronSecret === envSecret)

  if (!isValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await runNotificationCronJobs()
  return NextResponse.json({ success: true, ...result })
})
