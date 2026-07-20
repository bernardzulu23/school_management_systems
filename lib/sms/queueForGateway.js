/**
 * Fork point: queue SMS for the school's Android SIM gateway, or fall through
 * to Africala/Mocean. Switching back to provider-only is a one-line change at
 * the call site (skip this helper / set customGatewayEnabled=false).
 */
import { randomUUID } from 'crypto'
import { basePrisma } from '@/lib/prisma/client'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

/**
 * @param {{ schoolId: string, to: string|string[], message: string, from?: string|null }} opts
 * @returns {Promise<{ queued: boolean, reason?: string, messageIds?: string[], recipients?: string[] }>}
 */
export async function queueForGatewayIfEnabled({ schoolId, to, message }) {
  const sid = String(schoolId || '').trim()
  if (!sid) return { queued: false, reason: 'no_school' }

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
}
