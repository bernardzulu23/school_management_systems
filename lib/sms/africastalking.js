import AfricasTalking from 'africastalking'
import { logger, captureError } from '@/lib/utils/logger'

let smsClient = null
let smsClientKey = ''

const AT_OK_STATUS_CODES = new Set([100, 101, 102])

function readAtCredentials() {
  const apiKey = String(
    process.env.AFRICASTALKING_API_KEY || process.env.AFRICAS_TALKING_API_KEY || ''
  ).trim()
  const username = String(
    process.env.AFRICASTALKING_USERNAME || process.env.AFRICAS_TALKING_USERNAME || ''
  ).trim()
  return { apiKey, username, configured: Boolean(apiKey && username) }
}

export const SMS_TEMPLATES = {
  PORTAL_CREATED: (schoolName, subdomain) =>
    `Welcome to ZSMS! Your school portal for ${schoolName} is ready at ${subdomain}.bluepeacktechnologies.com. Login with the credentials sent to your email.`,
  SBA_DEADLINE_REMINDER: (teacherName, subject, form) =>
    `ZSMS Reminder: Dear ${teacherName}, ECZ SBA scores for ${subject} ${form} are due by 31 January. Please submit via your dashboard at zsms.app.`,
  ATTENDANCE_ALERT: (studentName, date, schoolName) =>
    `${schoolName}: ${studentName} was marked absent on ${date}. Please contact the school if this is incorrect.`,
  RESULTS_PUBLISHED: (studentName, term) =>
    `ZSMS: ${studentName}'s ${term} results are now available. Login to view them at your school portal.`,
  PAYMENT_CONFIRMED: (amount, schoolName) =>
    `Payment confirmed: K${amount} received for ${schoolName} ZSMS subscription. Thank you.`,
}

function getSMSClient() {
  const { apiKey, username, configured } = readAtCredentials()
  if (!configured) return null

  const key = `${username}:${apiKey.slice(0, 8)}`
  if (!smsClient || smsClientKey !== key) {
    const at = AfricasTalking({ apiKey, username })
    smsClient = at.SMS
    smsClientKey = key
  }
  return smsClient
}

export function normalizeZambianPhoneNumber(input) {
  const raw = String(input || '').trim()
  if (!raw) return null

  const keepPlus = raw.startsWith('+')
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null

  if (keepPlus) return `+${digits}`
  if (digits.startsWith('260')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+260${digits.slice(1)}`
  if (digits.length === 9) return `+260${digits}`
  return `+${digits}`
}

export function normalizeZambianPhoneNumbers(to) {
  const inputs = Array.isArray(to) ? to : [to]
  return Array.from(
    new Set(
      inputs
        .flatMap((v) =>
          String(v || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        )
        .map(normalizeZambianPhoneNumber)
        .filter((n) => /^\+260[79]\d{8}$/.test(n || ''))
    )
  )
}

function recipientOutcome(rows) {
  const list = Array.isArray(rows) ? rows : []
  const accepted = list.filter((r) => AT_OK_STATUS_CODES.has(Number(r?.statusCode)))
  const rejected = list.filter((r) => !AT_OK_STATUS_CODES.has(Number(r?.statusCode)))
  return { accepted, rejected }
}

async function sendWithClient(client, payload) {
  const result = await client.send(payload)
  const rows = result?.SMSMessageData?.Recipients || []
  const { accepted, rejected } = recipientOutcome(rows)
  return { result, rows, accepted, rejected }
}

export async function sendSMS(phoneNumbers, message, from, options = {}) {
  const log = logger({ route: 'SMS:send' })
  const creds = readAtCredentials()

  if (!creds.configured) {
    log.warn("SMS not configured — missing Africa's Talking credentials", {
      recipients: Array.isArray(phoneNumbers) ? phoneNumbers.length : 1,
      hasApiKey: Boolean(creds.apiKey),
      hasUsername: Boolean(creds.username),
    })
    return { success: false, reason: 'SMS not configured', results: [] }
  }

  const recipients = normalizeZambianPhoneNumbers(phoneNumbers)
  if (recipients.length === 0) {
    return { success: false, reason: 'No valid Zambian phone numbers', results: [] }
  }

  const text = String(message || '').trim()
  if (!text) {
    return { success: false, reason: 'Message is required', results: [] }
  }

  try {
    const client = getSMSClient()
    if (!client) {
      return { success: false, reason: 'SMS not configured', results: [] }
    }

    const basePayload = {
      to: recipients,
      message: text,
      enqueue: options.enqueue !== false,
    }
    const fromId = from ? String(from).trim() : ''

    let attempt = await sendWithClient(
      client,
      fromId ? { ...basePayload, from: fromId } : basePayload
    )

    // Approved sender IDs are often pending in Zambia — retry without `from`.
    const rejectedAsSender = attempt.rejected.some(
      (r) => Number(r?.statusCode) === 402 || /InvalidSenderId/i.test(String(r?.status || ''))
    )
    if (fromId && attempt.rows.length > 0 && attempt.accepted.length === 0 && rejectedAsSender) {
      log.warn("Africa's Talking InvalidSenderId — retrying without from", { from: fromId })
      attempt = await sendWithClient(client, basePayload)
    }

    if (attempt.rows.length > 0 && attempt.accepted.length === 0) {
      const reason =
        attempt.rejected.map((r) => `${r?.status || 'Rejected'}(${r?.statusCode})`).join(', ') ||
        attempt.result?.SMSMessageData?.Message ||
        'All recipients rejected'
      log.warn("SMS rejected by Africa's Talking", { reason, recipients: attempt.rows.length })
      return { success: false, reason, results: attempt.rows }
    }

    log.info('SMS sent', {
      recipients: attempt.accepted.length || attempt.rows.length,
      rejected: attempt.rejected.length,
      usernamePreview: `${creds.username.slice(0, 3)}…`,
    })
    return { success: true, results: attempt.rows }
  } catch (error) {
    captureError(error, { route: 'SMS:send', recipients: recipients.length })
    return {
      success: false,
      reason: error instanceof Error ? error.message : 'SMS send failed',
      results: [],
    }
  }
}

export const smsService = { sendSMS, SMS_TEMPLATES }
