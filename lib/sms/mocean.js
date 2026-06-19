import { normalizeZambianPhoneNumbers } from '@/lib/sms/africastalking'
import { logger, captureError } from '@/lib/utils/logger'

const MOCEAN_SMS_URL = 'https://rest.moceanapi.com/rest/2/sms'

function getMoceanToken() {
  return String(process.env.MOCEAN_API_TOKEN || '').trim()
}

export function isMoceanConfigured() {
  return Boolean(getMoceanToken())
}

function toMoceanRecipients(phoneNumbers) {
  return normalizeZambianPhoneNumbers(phoneNumbers).map((n) => n.replace(/^\+/, ''))
}

export async function sendMoceanSms(phoneNumbers, message, from, _options = {}) {
  const log = logger({ route: 'SMS:mocean' })
  const token = getMoceanToken()

  if (!token) {
    log.warn('Mocean not configured — missing MOCEAN_API_TOKEN', {
      recipients: Array.isArray(phoneNumbers) ? phoneNumbers.length : 1,
    })
    return { success: false, reason: 'Mocean not configured', results: [] }
  }

  const recipients = toMoceanRecipients(phoneNumbers)
  if (recipients.length === 0) {
    return { success: false, reason: 'No valid Zambian phone numbers', results: [] }
  }

  const text = String(message || '').trim()
  if (!text) {
    return { success: false, reason: 'Message is required', results: [] }
  }

  const params = new URLSearchParams()
  params.set('mocean-to', recipients.join(' '))
  params.set('mocean-text', text)
  params.set('mocean-resp-format', 'JSON')
  if (from) params.set('mocean-from', String(from).trim())

  try {
    const response = await fetch(MOCEAN_SMS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const raw = await response.text()
    let payload = null
    try {
      payload = raw ? JSON.parse(raw) : null
    } catch {
      payload = null
    }

    const row = payload?.messages?.[0] || {}
    const status = Number(row.status)
    const ok = response.status === 202 && status === 0

    if (!ok) {
      const reason = String(row.err_msg || raw || `Mocean HTTP ${response.status}`).trim()
      log.warn('Mocean SMS failed', { status, reason, httpStatus: response.status })
      return { success: false, reason, results: payload?.messages || [] }
    }

    log.info('Mocean SMS sent', { recipients: recipients.length, msgid: row.msgid })
    return {
      success: true,
      results: payload?.messages || [],
      msgid: row.msgid || null,
    }
  } catch (error) {
    captureError(error, { route: 'SMS:mocean', recipients: recipients.length })
    return {
      success: false,
      reason: error instanceof Error ? error.message : 'Mocean SMS send failed',
      results: [],
    }
  }
}

export const moceanSmsService = { sendMoceanSms, isMoceanConfigured }
