/**
 * Shared PII scrubbing for structured logs and Sentry.
 * Never send student names, grades, medical notes, phones, or raw emails to aggregators.
 */

const BLOCKED_KEY_EXACT = new Set(
  [
    'password',
    'passwordhash',
    'token',
    'authorization',
    'cookie',
    'refresh_token',
    'access_token',
    'secret',
    'apikey',
    'api_key',
    'webhook_secret',
    'name',
    'fullname',
    'lastname',
    'fullname',
    'studentname',
    'pupilname',
    'guardianname',
    'parentname',
    'email',
    'parentemail',
    'guardianemail',
    'phone',
    'phonenumber',
    'contact_number',
    'contactnumber',
    'mobile',
    'nrc',
    'nrcnumber',
    'medical',
    'medicalnotes',
    'medicalinfo',
    'allergies',
    'address',
    'homeaddress',
    'dateofbirth',
    'dob',
    'grade',
    'score',
    'marks',
    'percentage',
    'result',
    'results',
    'body',
    'message',
    'smsbody',
    'content',
  ].map((k) => k.toLowerCase())
)

const BLOCKED_KEY_PARTIAL = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'student_name',
  'pupil_name',
  'guardian',
  'parent_phone',
  'medical',
  'nrc',
  'email',
  'phone',
  'contact_number',
]

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PHONE_RE = /(?:\+?260|0)?(?:97|96|95|76|77|75)\d{7}\b/g
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isBlockedPiiKey(key) {
  const n = normalizeKey(key)
  if (!n) return false
  if (BLOCKED_KEY_EXACT.has(n)) return true
  return BLOCKED_KEY_PARTIAL.some((p) => n.includes(p.replace(/_/g, '')))
}

/**
 * Scrub free-text values (emails, Zambian mobiles). Keep short codes/ids.
 * @param {unknown} value
 * @returns {unknown}
 */
export function scrubStringValue(value) {
  if (typeof value !== 'string') return value
  let out = value
  out = out.replace(EMAIL_RE, '[email]')
  out = out.replace(PHONE_RE, '[phone]')
  // Truncate long free text that may contain pupil PII
  if (out.length > 500) out = `${out.slice(0, 500)}…[truncated]`
  return out
}

/**
 * Deep scrub objects for logging / Sentry extras.
 * @param {unknown} input
 * @param {number} [depth]
 * @returns {unknown}
 */
export function scrubPiiDeep(input, depth = 0) {
  if (input == null) return input
  if (depth > 6) return '[max-depth]'
  if (typeof input === 'string') return scrubStringValue(input)
  if (typeof input === 'number' || typeof input === 'boolean') return input
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((v) => scrubPiiDeep(v, depth + 1))
  }
  if (typeof input !== 'object') return String(input)

  /** @type {Record<string, unknown>} */
  const out = {}
  for (const [key, value] of Object.entries(input)) {
    if (isBlockedPiiKey(key)) {
      out[key] = '[redacted]'
      continue
    }
    out[key] = scrubPiiDeep(value, depth + 1)
  }
  return out
}

/**
 * Flat sanitize for log context (drop blocked keys entirely).
 * @param {Record<string, unknown>} [context]
 * @returns {Record<string, unknown>}
 */
export function sanitizeLogContext(context = {}) {
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const [key, value] of Object.entries(context || {})) {
    if (isBlockedPiiKey(key)) continue
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = scrubPiiDeep(value)
    } else if (typeof value === 'string') {
      out[key] = scrubStringValue(value)
    } else {
      out[key] = value
    }
  }
  return out
}

/**
 * Scrub exception messages that may embed pupil identifiers.
 * @param {string} message
 */
export function scrubExceptionMessage(message) {
  return scrubStringValue(String(message || ''))
    .replace(UUID_RE, '[id]')
    .slice(0, 1000)
}
