import { sendSMS } from '@/lib/sms/africastalking'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'
import { queueForGatewayIfEnabled } from '@/lib/sms/queueForGateway'
import { basePrisma } from '@/lib/prisma/client'
import { randomUUID } from 'crypto'

function isAfricasTalkingConfigured() {
  // Always read process.env at call time (do not rely on import-time env snapshot).
  return Boolean(
    (process.env.AFRICASTALKING_API_KEY || process.env.AFRICAS_TALKING_API_KEY) &&
    (process.env.AFRICASTALKING_USERNAME || process.env.AFRICAS_TALKING_USERNAME)
  )
}

/** Prefer Android gateway first only when explicitly opted in (cost-saving mode). */
function preferCustomGatewayFirst() {
  const v = String(process.env.SMS_PREFER_CUSTOM_GATEWAY || '')
    .trim()
    .toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Cloud SMS provider — Africa's Talking. */
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

async function tryAfricasTalking({ recipients, msg, from, enqueue, schoolId, persistLog }) {
  if (!isAfricasTalkingConfigured()) {
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

  if (persistLog && schoolId && recipients.length) {
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

async function tryCustomGateway({ schoolId, recipients, msg }) {
  if (!schoolId) return null
  const gatewayResult = await queueForGatewayIfEnabled({
    schoolId,
    to: recipients,
    message: msg,
  })
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
  return { queued: false, reason: gatewayResult.reason || null }
}

/**
 * Route outbound SMS:
 * 1. Africa's Talking (primary — reliable cloud delivery)
 * 2. Android SIM gateway if AT fails / not configured and customGatewayEnabled + online
 *
 * Set SMS_PREFER_CUSTOM_GATEWAY=true to restore gateway-first (cost-saving) order.
 */
export async function sendOutboundSms({
  to,
  message,
  from = null,
  enqueue = true,
  schoolId = null,
  persistLog = true,
}) {
  const recipients = normalizePhoneNumbers(to)
  const msg = String(message || '').trim()
  const gatewayFirst = preferCustomGatewayFirst()

  if (gatewayFirst && schoolId) {
    const gw = await tryCustomGateway({ schoolId, recipients, msg })
    if (gw?.ok) return gw
    console.log("[sms] Gateway not used — falling back to Africa's Talking", {
      schoolId,
      reason: gw?.reason || null,
    })
  }

  const atResult = await tryAfricasTalking({
    recipients,
    msg,
    from,
    enqueue,
    schoolId,
    persistLog,
  })
  if (atResult.ok) return atResult

  // AT failed or missing — try Android gateway as backup (unless we already tried first).
  if (!gatewayFirst && schoolId) {
    console.warn("[sms] Africa's Talking failed — trying Android gateway", {
      schoolId,
      reason: atResult.reason || null,
    })
    const gw = await tryCustomGateway({ schoolId, recipients, msg })
    if (gw?.ok) return gw
  }

  if (!atResult.provider && atResult.reason === 'SMS not configured') {
    console.error("[sms] Africa's Talking not configured and gateway unavailable", {
      schoolId,
      recipients,
    })
  }

  return atResult
}
