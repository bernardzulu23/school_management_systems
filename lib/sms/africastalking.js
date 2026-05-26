import AfricasTalking from 'africastalking'
import { env } from '@/lib/config/env'
import { logger, captureError } from '@/lib/utils/logger'

let smsClient = null

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
  if (!env.features.sms) return null
  if (!smsClient) {
    const at = AfricasTalking({
      apiKey: String(env.atApiKey || ''),
      username: String(env.atUsername || ''),
    })
    smsClient = at.SMS
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

export async function sendSMS(phoneNumbers, message, from, options = {}) {
  const log = logger({ route: 'SMS:send' })

  if (!env.features.sms) {
    log.warn("SMS not configured — missing Africa's Talking credentials", {
      recipients: Array.isArray(phoneNumbers) ? phoneNumbers.length : 1,
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
    const payload = {
      to: recipients,
      message: text,
      enqueue: options.enqueue !== false,
    }
    if (from) payload.from = String(from).trim()

    const result = await getSMSClient().send(payload)
    const rows = result?.SMSMessageData?.Recipients || []
    log.info('SMS sent', { recipients: rows.length })
    return { success: true, results: rows }
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
