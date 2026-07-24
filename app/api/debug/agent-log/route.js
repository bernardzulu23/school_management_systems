export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { agentDebugLog } from '@/lib/debug/agentLog'

/** Client → server bridge for debug-session NDJSON (timetable debug). */
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  agentDebugLog({
    ...body,
    location: body?.location || 'api/debug/agent-log',
    message: body?.message || 'client bridge',
  })
  return NextResponse.json({ ok: true })
}
