import { basePrisma } from '@/lib/prisma/client'
import { pushSmsLog } from '@/lib/sms'

export async function createSmsLog({
  schoolId,
  direction = 'out',
  recipient,
  fromNumber = null,
  body,
  status = 'SENT',
  provider = 'africastalking',
  channel = null,
  gatewayId = null,
  providerRef = null,
  broadcastId = null,
  idempotencyKey = null,
  failureReason = null,
}) {
  const resolvedChannel = channel || (provider === 'custom_gateway' ? 'CUSTOM_GATEWAY' : 'AFRICALA')

  const entry = {
    direction,
    schoolId: schoolId || null,
    to: recipient,
    from: fromNumber,
    message: body,
    text: body,
    status,
    provider,
    channel: resolvedChannel,
    gatewayId,
    providerRef,
    broadcastId,
    idempotencyKey,
    failureReason,
    createdAt: new Date().toISOString(),
  }

  pushSmsLog(entry)

  if (!schoolId) return entry

  try {
    await basePrisma.smsLog.create({
      data: {
        schoolId,
        direction,
        recipient: recipient || null,
        fromNumber,
        body: body || null,
        status,
        provider,
        channel: resolvedChannel,
        gatewayId,
        providerRef,
        broadcastId,
        idempotencyKey,
        failureReason,
      },
    })
  } catch (e) {
    if (e?.code === 'P2002' && idempotencyKey) {
      return entry
    }
    console.error('[SMS_LOG_PERSIST]', e?.message || e)
  }

  return entry
}

function truncateBody(body, max = 160) {
  const text = String(body || '')
  if (text.length <= max) return text || null
  return `${text.slice(0, max)}…`
}

/**
 * Fast school delivery-log read — lean select + composite index friendly.
 */
export async function listSmsLogsForSchool(schoolId, { limit = 100 } = {}) {
  const take = Math.min(200, Math.max(1, Number(limit) || 100))
  const rows = await basePrisma.smsLog.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      direction: true,
      recipient: true,
      fromNumber: true,
      body: true,
      status: true,
      provider: true,
      providerRef: true,
      broadcastId: true,
      channel: true,
      gatewayId: true,
      failureReason: true,
      createdAt: true,
    },
  })

  return rows.map((r) => ({
    id: r.id,
    direction: r.direction,
    to: r.recipient,
    from: r.fromNumber,
    message: truncateBody(r.body),
    text: truncateBody(r.body),
    status: r.status,
    provider: r.provider,
    providerRef: r.providerRef,
    broadcastId: r.broadcastId,
    channel: r.channel || null,
    gatewayId: r.gatewayId || null,
    failureReason: r.failureReason || null,
    createdAt: r.createdAt.toISOString(),
  }))
}
