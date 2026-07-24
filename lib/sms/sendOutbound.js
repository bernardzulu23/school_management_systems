import { sendSMS } from '@/lib/sms/africastalking'
import { isMoceanConfigured, sendMoceanSms } from '@/lib/sms/mocean'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'
import { env } from '@/lib/config/env'
import { queueForGatewayIfEnabled } from '@/lib/sms/queueForGateway'
import { basePrisma } from '@/lib/prisma/client'
import { randomUUID } from 'crypto'

/**
 * Mocean / Africa's Talking — disabled while the custom Android gateway is the
 * sole SMS channel. Flip `true` only as an emergency measure if the gateway is
 * down, or once Africala sender-ID is approved (then also re-architect this as
 * intended primary/backup, not just leave the flag true long-term).
 * See docs/ZSMS_gateway_sole_channel.md.
 */
const ENABLE_LEGACY_SMS_FALLBACK = false

function isAfricasTalkingConfigured() {
  return Boolean(env.atApiKey && env.atUsername)
}

export function resolveSmsProvider() {
  if (isMoceanConfigured()) return 'mocean'
  if (isAfricasTalkingConfigured()) return 'africastalking'
  return null
}

/**
 * Persist a distinguishable failure when the gateway path could not queue and
 * legacy Mocean/Africala fallback is off — so SmsLog does not look like a
 * normal provider send failure.
 */
async function recordGatewayNoFallbackFailures({ schoolId, recipients, message, reason }) {
  if (!schoolId || !recipients?.length) return []
  const ids = []
  for (const phone of recipients) {
    const row = await basePrisma.smsLog.create({
      data: {
        schoolId,
        direction: 'out',
        recipient: phone,
        body: String(message || '').trim() || null,
        status: 'FAILED_NO_FALLBACK',
        provider: 'custom_gateway',
        channel: 'CUSTOM_GATEWAY',
        failureReason: 'gateway_unavailable_no_fallback',
        idempotencyKey: `gw-nofallback:${schoolId}:${randomUUID()}`,
      },
    })
    ids.push(row.id)
  }
  console.error('[sms] Gateway failed — no legacy fallback enabled', {
    schoolId,
    recipients,
    reason,
    failureReason: 'gateway_unavailable_no_fallback',
    smsLogIds: ids,
  })
  return ids
}

/**
 * Route outbound SMS: custom Android SIM gateway is the sole active channel.
 * Mocean / Africa's Talking remain below, gated by ENABLE_LEGACY_SMS_FALLBACK.
 *
 * Pass schoolId whenever available so the gateway fork can apply.
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

    // Gateway path was in play (enabled) but could not queue — stop unless legacy fallback is on.
    if (gatewayResult.reason !== 'flag_off' && gatewayResult.reason !== 'no_school') {
      if (!ENABLE_LEGACY_SMS_FALLBACK) {
        await recordGatewayNoFallbackFailures({
          schoolId,
          recipients,
          message: msg,
          reason: gatewayResult.reason,
        })
        return {
          ok: false,
          recipients,
          provider: 'custom_gateway',
          channel: 'CUSTOM_GATEWAY',
          reason: 'gateway_failed_no_fallback_enabled',
          failureReason: 'gateway_unavailable_no_fallback',
          response: { gatewayReason: gatewayResult.reason || null },
          queuedForGateway: false,
        }
      }
      // ENABLE_LEGACY_SMS_FALLBACK === true → fall through to Mocean / Africala below.
    }
  }

  if (!ENABLE_LEGACY_SMS_FALLBACK) {
    // No gateway enqueue (flag off, missing schoolId, etc.) and legacy providers disabled.
    console.error('[sms] No gateway send and legacy SMS fallback is disabled', {
      schoolId,
      recipients,
      gatewayReason: gatewayResult?.reason || (schoolId ? null : 'no_school'),
    })
    if (schoolId && recipients.length) {
      await recordGatewayNoFallbackFailures({
        schoolId,
        recipients,
        message: msg,
        reason: gatewayResult?.reason || 'gateway_not_used',
      })
    }
    return {
      ok: false,
      recipients,
      provider: null,
      channel: null,
      reason: 'gateway_failed_no_fallback_enabled',
      failureReason: 'gateway_unavailable_no_fallback',
      response: null,
      queuedForGateway: false,
    }
  }

  // --- Legacy Mocean → Africa's Talking (kept intact for emergency / post-approval) ---
  const provider = resolveSmsProvider()

  if (!provider) {
    return {
      ok: false,
      recipients,
      provider: null,
      reason: 'SMS not configured',
      response: null,
    }
  }

  if (provider === 'mocean') {
    const result = await sendMoceanSms(recipients, msg, from || undefined)
    return {
      ok: result.success,
      recipients,
      provider: 'mocean',
      reason: result.reason || null,
      response: { messages: result.results || [], msgid: result.msgid || null },
    }
  }

  const result = await sendSMS(recipients, msg, from || undefined, { enqueue })
  return {
    ok: result.success,
    recipients,
    provider: 'africastalking',
    reason: result.reason || null,
    response: { SMSMessageData: { Recipients: result.results || [] } },
  }
}
