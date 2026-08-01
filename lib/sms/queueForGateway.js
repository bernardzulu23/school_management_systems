/**
 * Fork point: queue SMS for the school's Android SIM gateway.
 * If the gateway is offline (lastSeenAt older than 5 minutes), returns
 * queued:false so sendOutboundSms can fall through to Africa's Talking.
 */
import { randomUUID } from 'crypto'
import { basePrisma } from '@/lib/prisma/client'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

/** Gateway considered online if lastSeenAt is within this window. */
export const GATEWAY_ONLINE_WINDOW_MS = 5 * 60 * 1000

/**
 * @param {{ schoolId: string, to: string|string[], message: string, from?: string|null }} opts
 * @returns {Promise<{ queued: boolean, reason?: string, messageIds?: string[], recipients?: string[] }>}
 */
export async function queueForGatewayIfEnabled({ schoolId, to, message }) {
  const sid = String(schoolId || '').trim()
  if (!sid) return { queued: false, reason: 'no_school' }

  try {
    const settings = await basePrisma.schoolSmsSettings.findUnique({
      where: { schoolId: sid },
      select: { customGatewayEnabled: true },
    })

    if (!settings?.customGatewayEnabled) {
      return { queued: false, reason: 'flag_off' }
    }

    const gateway = await basePrisma.sMSGateway.findFirst({
      where: { schoolId: sid, isActive: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!gateway) {
      return { queued: false, reason: 'no_active_gateway' }
    }

    const lastSeen = gateway.lastSeenAt ? new Date(gateway.lastSeenAt).getTime() : 0
    const onlineCutoff = Date.now() - GATEWAY_ONLINE_WINDOW_MS
    if (!lastSeen || lastSeen < onlineCutoff) {
      console.log('[sms] Android gateway offline — skip queue', {
        schoolId: sid,
        gatewayId: gateway.id,
        lastSeenAt: gateway.lastSeenAt || null,
      })
      return { queued: false, reason: 'gateway_offline' }
    }

    const recipients = normalizePhoneNumbers(to)
    const body = String(message || '').trim()
    if (!recipients.length || !body) {
      return { queued: false, reason: 'invalid_payload' }
    }

    const messageIds = []
    for (const phone of recipients) {
      const row = await basePrisma.smsLog.create({
        data: {
          schoolId: sid,
          direction: 'out',
          recipient: phone,
          body,
          status: 'PENDING',
          provider: 'custom_gateway',
          channel: 'CUSTOM_GATEWAY',
          gatewayId: gateway.id,
          idempotencyKey: `gw:${gateway.id}:${randomUUID()}`,
        },
      })
      messageIds.push(row.id)
    }

    return { queued: true, messageIds, recipients }
  } catch (err) {
    const detail =
      err instanceof Error
        ? err.message
        : err?.type === 'error'
          ? 'Neon/Prisma transport ErrorEvent'
          : String(err?.message || err || 'gateway_queue_failed')
    console.error('[sms] queueForGatewayIfEnabled failed', { schoolId: sid, detail, err })
    return { queued: false, reason: `gateway_queue_error:${detail.slice(0, 120)}` }
  }
}
