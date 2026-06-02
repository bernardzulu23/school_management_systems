export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { verifyQStashRequest } from '@/lib/sms/qstash'
import { dispatchBroadcast } from '@/lib/sms/broadcast'
import { workerUrl } from '@/lib/sms/qstash'

export const POST = withErrorHandler(async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('upstash-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing security token' }, { status: 401 })
  }

  const valid = await verifyQStashRequest(
    request,
    rawBody,
    workerUrl('/api/sms/broadcast-dispatcher')
  )
  if (!valid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 403 })
  }

  const { broadcastId } = JSON.parse(rawBody || '{}')
  if (!broadcastId) {
    return NextResponse.json({ error: 'broadcastId required' }, { status: 400 })
  }

  const result = await dispatchBroadcast(broadcastId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, published: result.published })
})
