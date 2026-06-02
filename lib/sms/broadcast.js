import prisma from '@/lib/prisma'
import { normalizePhoneNumbers } from '@/lib/sms'
import { reserveSmsCredits, refundSmsCredit } from '@/lib/sms/balance'
import { getQStashClient, isQStashConfigured, workerUrl } from '@/lib/sms/qstash'

const DISPATCH_CHUNK = 80

export async function createBroadcast({ schoolId, message, phoneNumbers, createdByUserId }) {
  const normalized = normalizePhoneNumbers(phoneNumbers)
  if (!normalized.length) {
    return { ok: false, status: 400, error: 'No valid Zambian phone numbers (+26097/96…)' }
  }

  const text = String(message || '').trim()
  if (!text) return { ok: false, status: 400, error: 'Message body is required' }

  if (!isQStashConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Bulk SMS queue is not configured (set QSTASH_TOKEN and signing keys)',
    }
  }

  const reserve = await reserveSmsCredits(schoolId, normalized.length)
  if (!reserve.ok) {
    return { ok: false, status: 402, error: reserve.reason, balance: reserve.balance }
  }

  const broadcast = await prisma.smsBroadcast.create({
    data: {
      schoolId,
      message: text,
      requestedCount: phoneNumbers.length,
      validCount: normalized.length,
      status: 'pending',
      createdByUserId: createdByUserId || null,
    },
  })

  await prisma.smsQueueItem.createMany({
    data: normalized.map((phone) => ({
      broadcastId: broadcast.id,
      schoolId,
      recipient: phone,
      message: text,
      status: 'pending',
      idempotencyKey: `${broadcast.id}:${phone}`,
    })),
  })

  const qstash = getQStashClient()
  await qstash.publishJSON({
    url: workerUrl('/api/sms/broadcast-dispatcher'),
    body: { broadcastId: broadcast.id, schoolId },
    retries: 3,
  })

  return {
    ok: true,
    broadcastId: broadcast.id,
    enqueued: normalized.length,
    balance: reserve.balance,
  }
}

export async function dispatchBroadcast(broadcastId) {
  const broadcast = await prisma.smsBroadcast.findUnique({
    where: { id: broadcastId },
  })
  if (!broadcast) return { ok: false, error: 'Broadcast not found' }

  await prisma.smsBroadcast.update({
    where: { id: broadcastId },
    data: { status: 'dispatching' },
  })

  const qstash = getQStashClient()
  if (!qstash) return { ok: false, error: 'QStash not configured' }

  const worker = workerUrl('/api/sms/queue-worker')
  let published = 0

  const batch = await prisma.smsQueueItem.findMany({
    where: { broadcastId, status: 'pending' },
    take: DISPATCH_CHUNK,
    orderBy: { createdAt: 'asc' },
  })

  if (batch.length) {
    await Promise.all(
      batch.map(async (item) => {
        await qstash.publishJSON({
          url: worker,
          body: {
            schoolId: item.schoolId,
            phone: item.recipient,
            message: item.message,
            broadcastId,
            queueItemId: item.id,
            idempotencyKey: item.idempotencyKey,
          },
          retries: 3,
          deduplicationId: item.idempotencyKey,
        })
        await prisma.smsQueueItem.update({
          where: { id: item.id },
          data: { status: 'enqueued', enqueuedAt: new Date() },
        })
        published += 1
      })
    )
  }

  const remaining = await prisma.smsQueueItem.count({
    where: { broadcastId, status: 'pending' },
  })

  if (remaining > 0) {
    await qstash.publishJSON({
      url: workerUrl('/api/sms/broadcast-dispatcher'),
      body: { broadcastId, schoolId: broadcast.schoolId },
      retries: 3,
    })
  } else {
    await finalizeBroadcastIfDone(broadcastId)
  }

  return { ok: true, published, remaining }
}

export async function processQueueWorkerPayload({
  schoolId,
  phone,
  message,
  broadcastId,
  queueItemId,
  idempotencyKey,
}) {
  if (queueItemId) {
    const item = await prisma.smsQueueItem.findUnique({ where: { id: queueItemId } })
    if (item?.status === 'sent') {
      return { delivered: true, skipped: true }
    }
  }

  const existing = idempotencyKey
    ? await prisma.smsLog.findUnique({ where: { idempotencyKey } })
    : null

  if (existing?.status === 'SENT') {
    return { delivered: true, skipped: true }
  }

  const { sendSMS } = await import('@/lib/sms/africastalking')
  const result = await sendSMS(
    [phone],
    message,
    process.env.AFRICASTALKING_SENDER_ID || undefined,
    {
      enqueue: false,
    }
  )

  const recipientRow = result?.results?.[0]
  const providerRef = recipientRow?.messageId || recipientRow?.status || null
  const success = Boolean(result?.success)

  if (queueItemId) {
    await prisma.smsQueueItem.update({
      where: { id: queueItemId },
      data: {
        status: success ? 'sent' : 'failed',
        providerRef: providerRef ? String(providerRef) : null,
        errorMessage: success ? null : String(result?.reason || 'send_failed'),
        sentAt: success ? new Date() : undefined,
      },
    })
  }

  const { createSmsLog } = await import('@/lib/sms/persistLog')
  await createSmsLog({
    schoolId,
    recipient: phone,
    body: message,
    status: success ? 'SENT' : 'FAILED',
    providerRef: providerRef ? String(providerRef) : success ? null : 'CARRIER_ERROR',
    broadcastId,
    idempotencyKey,
  })

  if (broadcastId) {
    await prisma.smsBroadcast.update({
      where: { id: broadcastId },
      data: success ? { sentCount: { increment: 1 } } : { failedCount: { increment: 1 } },
    })
    if (!success) {
      await refundSmsCredit(schoolId, 1)
    }
    await finalizeBroadcastIfDone(broadcastId)
  }

  if (!success) {
    const err = new Error(result?.reason || 'Carrier unreachable')
    err.statusCode = 500
    throw err
  }

  return { delivered: true, providerRef }
}

async function finalizeBroadcastIfDone(broadcastId) {
  const pending = await prisma.smsQueueItem.count({
    where: {
      broadcastId,
      status: { in: ['pending', 'enqueued'] },
    },
  })
  if (pending > 0) return

  const broadcast = await prisma.smsBroadcast.findUnique({ where: { id: broadcastId } })
  if (!broadcast || broadcast.status === 'completed') return

  const failed = broadcast.failedCount || 0
  await prisma.smsBroadcast.update({
    where: { id: broadcastId },
    data: {
      status: failed > 0 && broadcast.sentCount === 0 ? 'failed' : 'completed',
    },
  })
}
