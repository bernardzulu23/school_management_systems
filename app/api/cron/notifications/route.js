export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { runNotificationCronJobs } from '@/lib/cron/notificationCron'

function authorizeCron(request) {
  const secret = String(process.env.CRON_SECRET || '').trim()
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const cronHeader = request.headers.get('x-cron-secret') || ''
  if (!secret || (bearer !== secret && cronHeader !== secret)) {
    return false
  }
  return true
}

/** GET /api/cron/notifications — process scheduled + retries + cleanup */
export const GET = withErrorHandler(async function GET(request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runNotificationCronJobs()
  return NextResponse.json({ success: true, ...result })
})
