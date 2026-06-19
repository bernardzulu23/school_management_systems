import { sendSMS } from '@/lib/sms/africastalking'
import { isMoceanConfigured, sendMoceanSms } from '@/lib/sms/mocean'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'
import { env } from '@/lib/config/env'

function isAfricasTalkingConfigured() {
  return Boolean(env.atApiKey && env.atUsername)
}

export function resolveSmsProvider() {
  if (isMoceanConfigured()) return 'mocean'
  if (isAfricasTalkingConfigured()) return 'africastalking'
  return null
}

/**
 * Route outbound SMS: Mocean when MOCEAN_API_TOKEN is set, else Africa's Talking.
 */
export async function sendOutboundSms({ to, message, from = null, enqueue = true }) {
  const recipients = normalizePhoneNumbers(to)
  const msg = String(message || '').trim()
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
