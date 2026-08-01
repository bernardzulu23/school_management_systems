import { sendSMS } from '@/lib/sms/africastalking'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'
import { env } from '@/lib/config/env'
import { queueForGatewayIfEnabled } from '@/lib/sms/queueForGateway'
import { basePrisma } from '@/lib/prisma/client'
import { randomUUID } from 'crypto'

function isAfricasTalkingConfigured() {
  return Boolean(env.atApiKey && env.atUsername)
}

/** Cloud SMS provider — Africa's Talking only (Android gateway is tried first). */
export function resolveSmsProvider() {
  if (isAfricasTalkingConfigured()) return 'africastalking'
  return null
}

async function recordAfricasTalkingLogs({
  schoolId,
  recipients,
  message,
  status,
  providerRef = null,
  failureReason = null,
}) {
  if (!schoolId || !recipients?.length) return []
  const ids = []
  for (const phone of recipients) {
    const row = await basePrisma.smsLog.create({
      data: {
        schoolId,
        direction: 'out',
        recipient: phone,
        body: String(message || '').trim() || null,
        status,
        provider: 'africastalking',
        channel: 'AFRICALA',
        providerRef: providerRef || null,
        failureReason: failureReason || null,
        idempotencyKey: `at:${schoolId}:${randomUUID()}`,
      },
    })
    ids.push(row.id)
  }
  return ids
}

/**
 * Route outbound SMS:
 * 1. Android SIM gateway when customGatewayEnabled and gateway is online
 * 2. Africa's Talking as cloud fallback / primary when gateway unavailable
 */
export async function sendOutboundSms({
  to,
  message,
  from = null,
  enqueue = true,
  schoolId = null,
}) {
  const recipients = normalizePhoneNumbers(to)
  const msg = String(message || '').trim()

  let gatewayResult = null
  if (schoolId) {
    gatewayResult = await queueForGatewayIfEnabled({ schoolId, to: recipients, message: msg })
    if (gatewayResult.queued) {
      return {
        ok: true,
        recipients: gatewayResult.recipients || recipients,
        provider: 'custom_gateway',
        channel: 'CUSTOM_GATEWAY',
        reason: null,
        response: { messageIds: gatewayResult.messageIds || [] },
        queuedForGateway: true,
      }
    }

    console.log("[sms] Gateway not used — falling back to Africa's Talking", {
      schoolId,
      reason: gatewayResult.reason || null,
    })
  }

  const provider = resolveSmsProvider()
  if (!provider) {
    console.error("[sms] Africa's Talking not configured", {
      schoolId,
      recipients,
      gatewayReason: gatewayResult?.reason || (schoolId ? null : 'no_school'),
    })
    return {
      ok: false,
      recipients,
      provider: null,
      channel: null,
      reason: 'SMS not configured',
      response: null,
      queuedForGateway: false,
    }
  }

  const result = await sendSMS(recipients, msg, from || undefined, { enqueue })
  const atMessageId =
    result.results?.[0]?.messageId || result.results?.[0]?.id || result.msgid || null

  if (schoolId && recipients.length) {
    try {
      await recordAfricasTalkingLogs({
        schoolId,
        recipients,
        message: msg,
        status: result.success ? 'SENT' : 'FAILED',
        providerRef: atMessageId ? String(atMessageId) : null,
        failureReason: result.success ? null : result.reason || 'SMS send failed',
      })
    } catch (logErr) {
      console.error("[sms] Failed to persist Africa's Talking SmsLog", logErr)
    }
  }

  return {
    ok: result.success,
    recipients,
    provider: 'africastalking',
    channel: 'AFRICALA',
    reason: result.reason || null,
    response: { SMSMessageData: { Recipients: result.results || [] } },
    queuedForGateway: false,
  }
}
