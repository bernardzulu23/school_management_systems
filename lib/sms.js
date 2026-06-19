import { SMS_TEMPLATES } from '@/lib/sms/africastalking'
import { sendOutboundSms } from '@/lib/sms/sendOutbound'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

export { sendOutboundSms } from '@/lib/sms/sendOutbound'

export function getOnboardingSmsFrom() {
  return String(process.env.ZSMS_ONBOARDING_SENDER_ID || 'ZSMS').trim() || 'ZSMS'
}

export function getSchoolSmsFrom(_school = null) {
  const from = String(
    process.env.MOCEAN_SENDER_ID || process.env.AFRICASTALKING_SENDER_ID || ''
  ).trim()
  return from || null
}

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

export { normalizeZmPhoneNumber, normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

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
  schoolName,
}) {
  const safeStudent = String(studentName || 'your child').trim() || 'your child'
  const safeSchool = String(schoolName || 'School').trim() || 'School'
  const safeLoginUrl = String(loginUrl || '').trim()

  if (safeLoginUrl) {
    return (
      `${safeSchool}: Dear Parent/Guardian, the Term results for ${safeStudent} have been entered. ` +
      `Login at ${safeLoginUrl} using your child's credentials to view them.`
    )
  }

  const email = String(studentEmail ?? username ?? '').trim()
  const safeResetUrl = String(resetUrl || '').trim()
  const resetPart = safeResetUrl ? ` Forgot password: ${safeResetUrl}.` : ''

  if (!email) {
    return `${safeSchool}: Dear Parent/Guardian, all results for ${safeStudent} have been entered. Ask your child for login details or contact the school.${resetPart}`
  }

  return `${safeSchool}: Dear Parent/Guardian, all results for ${safeStudent} have been entered. Sign in with student email: ${email} and password from your child.${resetPart}`
}

export async function sendAfricasTalkingSms({ to, message, from = null, enqueue = true }) {
  const result = await sendOutboundSms({ to, message, from, enqueue })
  return {
    ok: result.ok,
    recipients: result.recipients,
    provider: result.provider || 'africastalking',
    reason: result.reason || null,
    response: result.response,
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

export { SMS_TEMPLATES }
