import prisma from '@/lib/prisma'
import { normalizePhoneNumbers, sendOutboundSms, getSchoolSmsFrom } from '@/lib/sms'
import { reserveSmsCredits, refundSmsCredit } from '@/lib/sms/balance'
import { getQStashClient, isQStashConfigured, workerUrl, toQstashDedupId } from '@/lib/sms/qstash'

const DISPATCH_CHUNK = 80
/** Max recipients to send inline when QStash is unavailable (avoids serverless timeouts). */
const SYNC_FALLBACK_MAX = 50

async function sendBroadcastSync({ schoolId, broadcastId, message, phones }) {
  const { createSmsLog } = await import('@/lib/sms/persistLog')
  let sent = 0
  let failed = 0

  for (const phone of phones) {
    const result = await sendOutboundSms({
      to: phone,
      message,
      from: getSchoolSmsFrom() || process.env.AFRICASTALKING_SENDER_ID || undefined,
      schoolId,
      enqueue: false,
      persistLog: false,
    })

    const ok = Boolean(result?.ok)
    if (ok) sent += 1
    else {
      failed += 1
      await refundSmsCredit(schoolId, 1)
    }

    await prisma.smsQueueItem.updateMany({
      where: { broadcastId, schoolId, recipient: phone },
      data: {
        status: ok ? (result?.queuedForGateway ? 'enqueued' : 'sent') : 'failed',
        errorMessage: ok ? null : String(result?.reason || result?.failureReason || 'send_failed'),
        sentAt: ok && !result?.queuedForGateway ? new Date() : undefined,
      },
    })

    // Gateway path already inserts SmsLog in queueForGatewayIfEnabled.
    if (!result?.queuedForGateway) {
      await createSmsLog({
        schoolId,
        recipient: phone,
        body: message,
        status: ok ? 'SENT' : 'FAILED',
        provider: result?.provider || 'africastalking',
        channel: result?.channel || null,
        failureReason: ok ? null : String(result?.reason || result?.failureReason || 'send_failed'),
        broadcastId,
        idempotencyKey: `${broadcastId}:${phone}`,
      }).catch(() => {})
    }
  }

  await prisma.smsBroadcast.updateMany({
    where: { id: broadcastId, schoolId },
    data: {
      sentCount: sent,
      failedCount: failed,
      status: failed > 0 && sent === 0 ? 'failed' : 'completed',
    },
  })

  return { sent, failed }
}

export async function createBroadcast({ schoolId, message, phoneNumbers, createdByUserId }) {
  const normalized = normalizePhoneNumbers(phoneNumbers)
  if (!normalized.length) {
    return { ok: false, status: 400, error: 'No valid Zambian phone numbers (+26097/96…)' }
  }

  const text = String(message || '').trim()
  if (!text) return { ok: false, status: 400, error: 'Message body is required' }

  const useQStash = isQStashConfigured()
  if (!useQStash && normalized.length > SYNC_FALLBACK_MAX) {
    return {
      ok: false,
      status: 503,
      error: `Bulk SMS queue is not configured (set QSTASH_TOKEN). For up to ${SYNC_FALLBACK_MAX} recipients, sends work without QStash.`,
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
      status: useQStash ? 'pending' : 'dispatching',
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

  if (!useQStash) {
    console.warn('[sms] QStash missing — sending broadcast synchronously', {
      schoolId,
      broadcastId: broadcast.id,
      count: normalized.length,
    })
    const sync = await sendBroadcastSync({
      schoolId,
      broadcastId: broadcast.id,
      message: text,
      phones: normalized,
    })
    return {
      ok: true,
      broadcastId: broadcast.id,
      enqueued: normalized.length,
      sent: sync.sent,
      failed: sync.failed,
      mode: 'sync',
      balance: reserve.balance,
    }
  }

  try {
    const qstash = getQStashClient()
    await qstash.publishJSON({
      url: workerUrl('/api/sms/broadcast-dispatcher'),
      body: { broadcastId: broadcast.id, schoolId },
      retries: 3,
    })
  } catch (err) {
    console.error('[sms] QStash publish failed — falling back to sync send', err?.message || err)
    if (normalized.length > SYNC_FALLBACK_MAX) {
      await prisma.smsBroadcast.updateMany({
        where: { id: broadcast.id, schoolId },
        data: { status: 'failed' },
      })
      for (let i = 0; i < normalized.length; i += 1) {
        await refundSmsCredit(schoolId, 1)
      }
      return {
        ok: false,
        status: 503,
        error: err?.message || 'Failed to enqueue bulk SMS (QStash)',
        balance: await (await import('@/lib/sms/balance')).getSmsBalance(schoolId),
      }
    }
    const sync = await sendBroadcastSync({
      schoolId,
      broadcastId: broadcast.id,
      message: text,
      phones: normalized,
    })
    return {
      ok: true,
      broadcastId: broadcast.id,
      enqueued: normalized.length,
      sent: sync.sent,
      failed: sync.failed,
      mode: 'sync_fallback',
      balance: reserve.balance,
    }
  }

  return {
    ok: true,
    broadcastId: broadcast.id,
    enqueued: normalized.length,
    mode: 'qstash',
    balance: reserve.balance,
  }
}

export async function dispatchBroadcast(broadcastId) {
  const broadcast = await prisma.smsBroadcast.findUnique({
    where: { id: broadcastId },
  })
  if (!broadcast) return { ok: false, error: 'Broadcast not found' }

  const schoolId = broadcast.schoolId

  await prisma.smsBroadcast.updateMany({
    where: { id: broadcastId, schoolId },
    data: { status: 'dispatching' },
  })

  const qstash = getQStashClient()
  if (!qstash) return { ok: false, error: 'QStash not configured' }

  const worker = workerUrl('/api/sms/queue-worker')
  let published = 0

  const batch = await prisma.smsQueueItem.findMany({
    where: { broadcastId, schoolId, status: 'pending' },
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
          deduplicationId: toQstashDedupId(item.idempotencyKey || item.id),
        })
        await prisma.smsQueueItem.updateMany({
          where: { id: item.id, schoolId },
          data: { status: 'enqueued', enqueuedAt: new Date() },
        })
        published += 1
      })
    )
  }

  const remaining = await prisma.smsQueueItem.count({
    where: { broadcastId, schoolId, status: 'pending' },
  })

  if (remaining > 0) {
    await qstash.publishJSON({
      url: workerUrl('/api/sms/broadcast-dispatcher'),
      body: { broadcastId, schoolId },
      retries: 3,
    })
  } else {
    await finalizeBroadcastIfDone(broadcastId, schoolId)
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
  if (!schoolId) {
    return { delivered: false, error: 'schoolId required' }
  }

  if (queueItemId) {
    const item = await prisma.smsQueueItem.findFirst({
      where: { id: queueItemId, schoolId },
    })
    if (item?.status === 'sent') {
      return { delivered: true, skipped: true }
    }
  }

  const existing = idempotencyKey
    ? await prisma.smsLog.findFirst({
        where: { idempotencyKey, schoolId },
      })
    : null

  if (existing?.status === 'SENT') {
    return { delivered: true, skipped: true }
  }

  const { sendOutboundSms } = await import('@/lib/sms/sendOutbound')
  const result = await sendOutboundSms({
    to: [phone],
    message,
    from: process.env.AFRICASTALKING_SENDER_ID || undefined,
    schoolId,
    enqueue: false,
    persistLog: false,
  })

  const recipientRow = result?.response?.SMSMessageData?.Recipients?.[0]
  const providerRef =
    recipientRow?.messageId ||
    recipientRow?.id ||
    (result?.queuedForGateway ? result?.response?.messageIds?.[0] : null) ||
    null
  const success = Boolean(result?.ok)

  if (queueItemId) {
    await prisma.smsQueueItem.updateMany({
      where: { id: queueItemId, schoolId },
      data: {
        status: success ? (result?.queuedForGateway ? 'enqueued' : 'sent') : 'failed',
        providerRef: providerRef ? String(providerRef) : null,
        errorMessage: success
          ? null
          : String(result?.reason || result?.failureReason || 'send_failed'),
        sentAt: success && !result?.queuedForGateway ? new Date() : undefined,
      },
    })
  }

  if (!result?.queuedForGateway) {
    const { createSmsLog } = await import('@/lib/sms/persistLog')
    await createSmsLog({
      schoolId,
      recipient: phone,
      body: message,
      status: success ? 'SENT' : 'FAILED',
      provider: result?.provider || 'africastalking',
      channel: result?.channel || null,
      providerRef: providerRef ? String(providerRef) : success ? null : 'CARRIER_ERROR',
      broadcastId,
      idempotencyKey,
      failureReason: success
        ? null
        : String(result?.reason || result?.failureReason || 'send_failed'),
    })
  }

  if (broadcastId) {
    await prisma.smsBroadcast.updateMany({
      where: { id: broadcastId, schoolId },
      data: success ? { sentCount: { increment: 1 } } : { failedCount: { increment: 1 } },
    })
    if (!success) {
      await refundSmsCredit(schoolId, 1)
    }
    await finalizeBroadcastIfDone(broadcastId, schoolId)
  }

  if (!success) {
    const err = new Error(result?.reason || result?.failureReason || 'Carrier unreachable')
    err.statusCode = 500
    throw err
  }

  return { delivered: true, providerRef }
}

async function finalizeBroadcastIfDone(broadcastId, schoolId) {
  const pending = await prisma.smsQueueItem.count({
    where: {
      broadcastId,
      ...(schoolId ? { schoolId } : {}),
      status: { in: ['pending', 'enqueued'] },
    },
  })
  if (pending > 0) return

  const broadcast = await prisma.smsBroadcast.findFirst({
    where: {
      id: broadcastId,
      ...(schoolId ? { schoolId } : {}),
    },
  })
  if (!broadcast || broadcast.status === 'completed') return

  const failed = broadcast.failedCount || 0
  await prisma.smsBroadcast.updateMany({
    where: {
      id: broadcastId,
      ...(schoolId ? { schoolId } : {}),
    },
    data: {
      status: failed > 0 && broadcast.sentCount === 0 ? 'failed' : 'completed',
    },
  })
}
