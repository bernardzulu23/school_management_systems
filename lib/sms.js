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

function getBaseDomainFromHost(host) {
  const hostName = String(host || '')
    .split(':')[0]
    .toLowerCase()
  if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return null
  const parts = hostName.split('.').filter(Boolean)
  if (parts.length < 2) return null
  return parts.slice(-2).join('.')
}

/**
 * Canonical student-portal URLs for SMS (school subdomain or custom domain).
 * Uses APP_BASE_DOMAIN / host-derived apex domain; falls back to request URL on localhost.
 */
export function getSchoolPortalLoginUrls(request, school) {
  const host = request?.headers?.get('host') || ''
  const baseUrl = getBaseUrlFromRequest(request).replace(/\/+$/, '')
  const baseDomain =
    String(process.env.APP_BASE_DOMAIN || '').trim() ||
    getBaseDomainFromHost(host) ||
    'bluepeacktechnologies.com'

  const sub = String(school?.subdomain || '')
    .trim()
    .toLowerCase()
  const customDomain = String(school?.domain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()

  const isLocal =
    host.includes('localhost') || host.startsWith('127.0.0.1') || baseDomain.includes('localhost')

  if (isLocal) {
    return {
      loginUrl: baseUrl ? `${baseUrl}/login` : '',
      forgotPasswordUrl: baseUrl ? `${baseUrl}/forgot-password` : '',
    }
  }

  const portalHost = customDomain || (sub ? `${sub}.${baseDomain}` : '')
  if (!portalHost) {
    return {
      loginUrl: baseUrl ? `${baseUrl}/login` : '',
      forgotPasswordUrl: baseUrl ? `${baseUrl}/forgot-password` : '',
    }
  }

  return {
    loginUrl: `https://${portalHost}/login`,
    forgotPasswordUrl: `https://${portalHost}/forgot-password`,
  }
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

export function buildChronicAbsenceSmsMessage({
  schoolName,
  studentName,
  subjectName,
  absenceCount,
  termLabel,
}) {
  const safeSchool = String(schoolName || 'School').trim() || 'School'
  const safeStudent = String(studentName || 'Student').trim() || 'Student'
  const subject = String(subjectName || 'a subject').trim()
  const count = Number(absenceCount) || 5
  const term = String(termLabel || '').trim()
  const termPart = term ? ` in ${term}` : ''
  return `${safeSchool}: ${safeStudent} has been absent ${count} times from ${subject}${termPart}. Please contact the school.`
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

export function buildTermResultsCompleteSmsMessage({
  studentName,
  studentEmail,
  username,
  loginUrl,
  resetUrl,
}) {
  const safeStudent = String(studentName || 'your child').trim() || 'your child'
  const email = String(studentEmail ?? username ?? '').trim()
  const safeLoginUrl = String(loginUrl || '').trim()
  const safeResetUrl = String(resetUrl || '').trim()

  const portalPart = safeLoginUrl ? ` Student portal: ${safeLoginUrl}.` : ''

  if (!email) {
    const contactPart = safeResetUrl ? ` Reset password: ${safeResetUrl}.` : ''
    return `Dear Parent/Guardian, all results for ${safeStudent} have been entered and are on the student portal.${portalPart} Ask your child for the login email and password, or contact the school.${contactPart} Thank you.`
  }

  const resetPart = safeResetUrl ? ` Forgot password: ${safeResetUrl}.` : ''

  return `Dear Parent/Guardian, all results for ${safeStudent} have been entered.${portalPart} Sign in with this student email: ${email} and password from your child.${resetPart} Thank you.`
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
