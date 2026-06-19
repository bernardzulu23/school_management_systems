export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { runFeeOverdueCron } from '@/lib/fees/overdueCron'

export async function GET(request) {
  const secret = String(process.env.CRON_SECRET || '').trim()
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const cronHeader = request.headers.get('x-cron-secret') || ''

  if (!secret || (bearer !== secret && cronHeader !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runFeeOverdueCron()
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Fee overdue cron failed' }, { status: 500 })
  }
}
