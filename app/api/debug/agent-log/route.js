export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { agentLog } from '@/lib/debug/agentLog'

/** Client-side debug ingest — writes NDJSON to debug-260cd5.log */
export async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const { location, message, data, hypothesisId } = body
  if (!location || !message) {
    return NextResponse.json({ ok: false, error: 'location and message required' }, { status: 400 })
  }

  agentLog(
    String(location),
    String(message),
    data && typeof data === 'object' ? data : {},
    String(hypothesisId || '')
  )
  return NextResponse.json({ ok: true })
}
