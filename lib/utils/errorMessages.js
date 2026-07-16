/**
 * User-facing error copy — never leak stacks, Prisma, SQL, or provider internals.
 */

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet.',
  AUTH_FAILED: 'Invalid credentials. Please try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FETCH_ERROR: 'Failed to fetch data. Please refresh the page.',
  UPDATE_ERROR: 'Failed to update record. Please try again.',
  DELETE_ERROR: 'Failed to delete record. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SESSION_EXPIRED: 'Your session expired. Please log in again.',
  IDLE_TIMEOUT: 'Signed out due to inactivity',
  FORBIDDEN: 'You are not authorized. Please log in again.',
  CSRF: 'Security token expired. Refresh the page and try again.',
  GENERIC: 'Something went wrong. Please try again.',
  AI_UNAVAILABLE: 'The AI service could not complete your request. Try again in a moment.',
}

const SAFE_EXACT = new Set(Object.values(ERROR_MESSAGES))

const TECH_RE =
  /prisma|postgres|neon\.tech|econnrefused|enotfound|etimedout|stack trace|\bat\s+\S+\s+\(|zod|internal server|sqlstate|undefined is not|cannot read prop|typeerror|referenceerror|syntaxerror|unexpected token|json\.parse|digest|api[_ ]?key|groq|openai|openrouter|huggingface|gemini|vercel|blob_read|database error|relation \".+\" does not exist|column \".+\"|foreign key|unique constraint|p\d{4}|errno|webpack|node_modules|file:\/\/|\\\\|\{[\s\S]*\}/i

function isReactNode(value) {
  if (value == null) return false
  if (typeof value === 'function') return true
  if (typeof value === 'object' && (value.$$typeof || value.type || value.props)) return true
  return false
}

/**
 * Convert any error-like value into a short, safe message for end users.
 * React nodes / toast renderers are returned unchanged.
 */
export function toUserFacingMessage(input, fallback = ERROR_MESSAGES.GENERIC) {
  if (isReactNode(input)) return input

  if (input && typeof input === 'object') {
    const nested =
      input.message ||
      input.error ||
      input.msg ||
      (typeof input.toString === 'function' && input.toString() !== '[object Object]'
        ? input.toString()
        : null)
    if (nested && nested !== input) {
      return toUserFacingMessage(nested, fallback)
    }
  }

  const raw = String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw) return fallback

  if (SAFE_EXACT.has(raw)) return raw

  const lower = raw.toLowerCase()
  if (lower.includes('session expired') || lower.includes('revoked')) {
    return ERROR_MESSAGES.SESSION_EXPIRED
  }
  if (lower.includes('csrf')) return ERROR_MESSAGES.CSRF
  if (lower.includes('unauthorized') || lower.includes('not authorized') || lower === 'forbidden') {
    return ERROR_MESSAGES.FORBIDDEN
  }
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed') ||
    lower.includes('offline')
  ) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  if (lower.includes('not found') || lower === '404') return ERROR_MESSAGES.NOT_FOUND

  if (TECH_RE.test(raw)) return fallback
  if (raw.includes('\n') || raw.length > 160) return fallback

  // Short plain UX strings (validation hints, etc.) are allowed
  return raw
}

/**
 * Map HTTP status + body to a safe user message.
 */
export function userFacingFromHttp(status, body, fallback = ERROR_MESSAGES.GENERIC) {
  const code = String(body?.code || '').toUpperCase()
  if (
    [
      'PLAN_EXPIRED',
      'PLAN_UPGRADE_REQUIRED',
      'UPGRADE_REQUIRED',
      'AI_LIMIT_REACHED',
      'AI_QUOTA_EXCEEDED',
    ].includes(code)
  ) {
    return toUserFacingMessage(body?.message || body?.error, ERROR_MESSAGES.VALIDATION_ERROR)
  }

  if (status === 401 || status === 403) {
    if (code === 'IDLE_TIMEOUT') {
      return ERROR_MESSAGES.IDLE_TIMEOUT
    }
    return toUserFacingMessage(ERROR_MESSAGES.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
  }
  if (status === 404) return ERROR_MESSAGES.NOT_FOUND
  if (status === 429) {
    return toUserFacingMessage(
      body?.message || body?.error,
      'Too many requests. Please wait a moment and try again.'
    )
  }
  if (status >= 500) {
    return toUserFacingMessage(body?.message || body?.error, ERROR_MESSAGES.SERVER_ERROR)
  }
  return toUserFacingMessage(body?.message || body?.error, fallback)
}
