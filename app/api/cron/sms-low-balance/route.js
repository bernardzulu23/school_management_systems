export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { runSmsLowBalanceCron } from '@/lib/sms/balance'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

/**
 * GET /api/cron/sms-low-balance — daily low SMS credit alerts. Requires CRON_SECRET.
 */
export const GET = withErrorHandler(async function GET(request) {
  const secret = String(process.env.CRON_SECRET || '').trim()
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const cronHeader = request.headers.get('x-cron-secret') || ''

  if (!secret || (bearer !== secret && cronHeader !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSmsLowBalanceCron()
  return NextResponse.json({ success: true, ...result })
})
