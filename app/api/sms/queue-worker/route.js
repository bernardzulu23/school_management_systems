export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { verifyQStashRequest, workerUrl } from '@/lib/sms/qstash'
import { processQueueWorkerPayload } from '@/lib/sms/broadcast'

export const POST = withErrorHandler(async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('upstash-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing security token' }, { status: 401 })
  }

  const valid = await verifyQStashRequest(request, rawBody, workerUrl('/api/sms/queue-worker'))
  if (!valid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 403 })
  }

  const payload = JSON.parse(rawBody || '{}')
  const { schoolId, phone, message, broadcastId, queueItemId, idempotencyKey } = payload

  if (!schoolId || !phone || !message) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    const result = await processQueueWorkerPayload({
      schoolId,
      phone,
      message,
      broadcastId,
      queueItemId,
      idempotencyKey,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[SMS_QUEUE_WORKER]', phone, error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Carrier infrastructure unreachable' },
      { status: error?.statusCode || 500 }
    )
  }
})
