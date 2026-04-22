import { ApiError } from '@/lib/middleware/errorHandler'

export function getBaseUrlFromRequest(request) {
  const proto =
    request?.headers?.get('x-forwarded-proto') || request?.headers?.get('x-forwarded-protocol')
  const host = request?.headers?.get('x-forwarded-host') || request?.headers?.get('host')
  const origin = request?.headers?.get('origin')
  const p = String(proto || '').trim() || 'https'
  const h = String(host || '').trim()
  if (h) return `${p}://${h}`
  return String(origin || '').trim() || ''
}

function getAfricasTalkingBaseUrl() {
  const explicit = String(process.env.AFRICASTALKING_BASE_URL || '').trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const username = String(process.env.AFRICASTALKING_USERNAME || '').trim()
  const env = String(process.env.AFRICASTALKING_ENV || '')
    .trim()
    .toLowerCase()

  const isSandbox = env === 'sandbox' || username.toLowerCase() === 'sandbox'
  return isSandbox ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com'
}

function requireAfricasTalkingCredentials() {
  const apiKey = String(process.env.AFRICASTALKING_API_KEY || '').trim()
  const username = String(process.env.AFRICASTALKING_USERNAME || '').trim()

  if (!apiKey) throw new ApiError('Missing AFRICASTALKING_API_KEY', 500)
  if (!username) throw new ApiError('Missing AFRICASTALKING_USERNAME', 500)

  return { apiKey, username }
}

export function normalizeZmPhoneNumber(input) {
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

export function normalizePhoneNumbers(to) {
  const inputs = Array.isArray(to) ? to : [to]
  const normalized = inputs
    .flatMap((v) =>
      String(v || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .map(normalizeZmPhoneNumber)
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

export function buildAttendanceSmsMessage({ schoolName, studentName, status, dateIso }) {
  const dateStr = String(dateIso || '').slice(0, 10)
  const safeSchool = String(schoolName || 'School').trim() || 'School'
  const safeStudent = String(studentName || 'Student').trim() || 'Student'
  const safeStatus = String(status || '')
    .trim()
    .toLowerCase()

  const label =
    safeStatus === 'present'
      ? 'PRESENT'
      : safeStatus === 'absent'
        ? 'ABSENT'
        : safeStatus === 'late'
          ? 'LATE'
          : safeStatus.toUpperCase() || 'UPDATED'

  return `${safeSchool}: Attendance update for ${safeStudent} on ${dateStr}: ${label}.`
}

export function buildWelcomeSmsMessage({ schoolName, loginUrl }) {
  const safeSchool = String(schoolName || 'your school').trim() || 'your school'
  const url = String(loginUrl || '').trim()
  return url
    ? `Welcome to Zambian School Management System, ${safeSchool}! Thank you for joining and purchasing the software. Login: ${url}`
    : `Welcome to Zambian School Management System, ${safeSchool}! Thank you for joining and purchasing the software.`
}

export function buildPasswordResetConfirmationSmsMessage({ appUrl, supportUrl }) {
  const a = String(appUrl || '').trim()
  const s = String(supportUrl || '').trim()
  const fallback = a ? `${a}/forgot-password` : ''
  const link = s || fallback
  return link
    ? `Your password was just reset. If you did not request this, reset it immediately: ${link}`
    : `Your password was just reset. If you did not request this, reset it immediately from the password reset page.`
}

export async function sendAfricasTalkingSms({ to, message, from = null, enqueue = true }) {
  const { apiKey, username } = requireAfricasTalkingCredentials()

  const recipients = normalizePhoneNumbers(to)
  if (recipients.length === 0) throw new ApiError('No valid recipient phone numbers', 400)

  const msg = String(message || '').trim()
  if (!msg) throw new ApiError('Message is required', 400)

  const baseUrl = getAfricasTalkingBaseUrl()
  const url = `${baseUrl}/version1/messaging`

  const body = new URLSearchParams()
  body.set('username', username)
  body.set('to', recipients.join(','))
  body.set('message', msg)
  if (from) body.set('from', String(from).trim())
  if (enqueue !== undefined && enqueue !== null) body.set('enqueue', enqueue ? '1' : '0')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: apiKey,
    },
    body,
  })

  const text = await res.text().catch(() => '')
  let parsed = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }

  if (!res.ok) {
    const err = new ApiError('Failed to send SMS', 502)
    err.details = parsed || text
    throw err
  }

  return {
    ok: true,
    recipients,
    provider: 'africastalking',
    response: parsed || text,
  }
}

export function pushSmsLog(entry) {
  if (!globalThis.__smsLogs) globalThis.__smsLogs = []
  globalThis.__smsLogs.unshift({ ...entry, createdAt: new Date().toISOString() })
  if (globalThis.__smsLogs.length > 500) globalThis.__smsLogs.length = 500
}

export function getSmsLogs() {
  return Array.isArray(globalThis.__smsLogs) ? globalThis.__smsLogs : []
}
