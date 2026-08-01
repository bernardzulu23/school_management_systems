import { SMS_TEMPLATES } from '@/lib/sms/africastalking'
import { sendOutboundSms } from '@/lib/sms/sendOutbound'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

export { sendOutboundSms } from '@/lib/sms/sendOutbound'

export function getOnboardingSmsFrom() {
  return String(process.env.ZSMS_ONBOARDING_SENDER_ID || 'ZSMS').trim() || 'ZSMS'
}

export function getSchoolSmsFrom(_school = null) {
  const from = String(process.env.AFRICASTALKING_SENDER_ID || '').trim()
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

export {
  normalizeZmPhoneNumber,
  normalizePhoneNumbers,
  normalizeParentContactFields,
} from '@/lib/sms/normalizePhone'

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

export function buildTimetableChangedSmsMessage({ schoolName, term, academicYear }) {
  const school = String(schoolName || 'School').trim() || 'School'
  const season = [term, academicYear].filter(Boolean).join(' ').trim() || 'this term'
  return (
    `${school}: Your teaching timetable for ${season} has changed. ` +
    `Please check your schedule in the ZSMS app or teacher portal.`
  )
}

/** Soft target for a single SMS segment; hard cap is TERM_RESULTS_SMS_HARD_MAX. */
export const TERM_RESULTS_SMS_SOFT_MAX = 160
export const TERM_RESULTS_SMS_HARD_MAX = 320
export const TERM_RESULTS_SMS_VIEW_URL = 'bluepeacktechnologies.com'

const SUBJECT_ABBREVIATIONS = {
  mathematics: 'MTH',
  maths: 'MTH',
  math: 'MTH',
  'english language': 'ENG',
  english: 'ENG',
  geography: 'GEO',
  history: 'HIS',
  biology: 'BIO',
  chemistry: 'CHE',
  physics: 'PHY',
  'integrated science': 'SCI',
  science: 'SCI',
  'religious education': 'RE',
  'civic education': 'CIV',
  civics: 'CIV',
  'computer studies': 'CST',
  'business studies': 'BUS',
  commerce: 'COM',
  accounts: 'ACC',
  accounting: 'ACC',
  agriculture: 'AGR',
  'agricultural science': 'AGR',
  french: 'FRE',
  literature: 'LIT',
  'literature in english': 'LIT',
  'design and technology': 'DAT',
  'home economics': 'HEC',
  art: 'ART',
  'art and design': 'ART',
  music: 'MUS',
  'physical education': 'PE',
  pe: 'PE',
}

export function abbreviateSchoolNameForSms(name, maxLen = 10) {
  const raw = String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!raw) return 'ZSMS'
  if (raw.length <= maxLen) return raw
  return raw.slice(0, maxLen).trimEnd() || 'ZSMS'
}

export function abbreviateSubjectNameForSms(name) {
  const raw = String(name || '')
    .trim()
    .replace(/[^\w\s&/-]/g, '')
    .replace(/\s+/g, ' ')
  if (!raw) return 'SUB'
  const key = raw.toLowerCase()
  if (SUBJECT_ABBREVIATIONS[key]) return SUBJECT_ABBREVIATIONS[key]
  const letters = raw.replace(/[^a-zA-Z0-9]/g, '')
  if (letters.length >= 3) return letters.slice(0, 3).toUpperCase()
  return (letters || 'SUB').toUpperCase()
}

export function formatResultGradeLine({ subjectName, score, grade }, { abbreviate = false } = {}) {
  const subject = abbreviate
    ? abbreviateSubjectNameForSms(subjectName)
    : String(subjectName || '')
        .trim()
        .replace(/[^\w\s&/-]/g, '')
        .replace(/\s+/g, ' ') || 'Subject'
  const scoreNum = score === null || score === undefined || score === '' ? null : Number(score)
  const scoreLabel = Number.isFinite(scoreNum) ? String(Math.round(scoreNum)) : 'N/A'
  const gradeLabel = String(grade || '')
    .trim()
    .toUpperCase()
  if (gradeLabel) return `${subject} ${scoreLabel} (${gradeLabel})`
  return `${subject} ${scoreLabel}`
}

function assembleTermResultsSms({ schoolLabel, studentLabel, gradeParts, viewUrl }) {
  const grades = gradeParts.join(', ')
  return `${schoolLabel}: ${studentLabel} — ${grades}. View at ${viewUrl}`
}

/**
 * Pure formatter for term-complete parent SMS with inline grades.
 * @returns {string | null} Message, or null when there are no grade rows.
 */
export function buildTermResultsCompleteSmsMessage({
  studentName,
  schoolName,
  results,
  viewUrl = TERM_RESULTS_SMS_VIEW_URL,
}) {
  const rows = Array.isArray(results) ? results : []
  if (rows.length === 0) return null

  const schoolLabel = abbreviateSchoolNameForSms(schoolName)
  const studentLabel = String(studentName || 'your child').trim() || 'your child'
  const safeViewUrl =
    String(viewUrl || TERM_RESULTS_SMS_VIEW_URL).trim() || TERM_RESULTS_SMS_VIEW_URL

  const sorted = [...rows].sort((a, b) =>
    String(a?.subjectName || '')
      .trim()
      .localeCompare(String(b?.subjectName || '').trim(), undefined, { sensitivity: 'base' })
  )

  const fullParts = sorted.map((r) => formatResultGradeLine(r, { abbreviate: false }))
  let message = assembleTermResultsSms({
    schoolLabel,
    studentLabel,
    gradeParts: fullParts,
    viewUrl: safeViewUrl,
  })

  if (message.length <= TERM_RESULTS_SMS_SOFT_MAX) return message

  const abbrParts = sorted.map((r) => formatResultGradeLine(r, { abbreviate: true }))
  message = assembleTermResultsSms({
    schoolLabel,
    studentLabel,
    gradeParts: abbrParts,
    viewUrl: safeViewUrl,
  })
  if (message.length <= TERM_RESULTS_SMS_HARD_MAX) return message

  // Drop trailing subjects until under hard cap; append "+N more".
  for (let keep = abbrParts.length - 1; keep >= 1; keep -= 1) {
    const dropped = abbrParts.length - keep
    const parts = [...abbrParts.slice(0, keep), `+${dropped} more`]
    message = assembleTermResultsSms({
      schoolLabel,
      studentLabel,
      gradeParts: parts,
      viewUrl: safeViewUrl,
    })
    if (message.length <= TERM_RESULTS_SMS_HARD_MAX) return message
  }

  // Last resort: truncate body.
  const suffix = `. View at ${safeViewUrl}`
  const prefix = `${schoolLabel}: ${studentLabel} — `
  const budget = TERM_RESULTS_SMS_HARD_MAX - suffix.length
  if (budget <= prefix.length) {
    return `${schoolLabel}: ${studentLabel}${suffix}`.slice(0, TERM_RESULTS_SMS_HARD_MAX)
  }
  return `${prefix}${abbrParts
    .join(', ')
    .slice(0, budget - prefix.length)
    .trimEnd()}${suffix}`
}

export async function sendSchoolSms({ to, message, from = null, enqueue = true, schoolId = null }) {
  const result = await sendOutboundSms({ to, message, from, enqueue, schoolId })
  return {
    ok: result.ok,
    recipients: result.recipients,
    provider: result.provider || 'custom_gateway',
    reason: result.reason || null,
    response: result.response,
    queuedForGateway: Boolean(result.queuedForGateway),
    failureReason: result.failureReason || null,
  }
}

/** @deprecated Use sendSchoolSms — kept as alias for older imports. */
export const sendAfricasTalkingSms = sendSchoolSms

export function pushSmsLog(entry) {
  if (!globalThis.__smsLogs) globalThis.__smsLogs = []
  globalThis.__smsLogs.unshift({ ...entry, createdAt: new Date().toISOString() })
  if (globalThis.__smsLogs.length > 500) globalThis.__smsLogs.length = 500
}

export function getSmsLogs() {
  return Array.isArray(globalThis.__smsLogs) ? globalThis.__smsLogs : []
}

export { SMS_TEMPLATES }
