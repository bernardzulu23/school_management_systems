/**
 * Mobile mirror of web userFacingFromHttp — never leak role/route internals.
 */

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet.',
  AUTH_FAILED: 'Invalid credentials. Please try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session expired. Please log in again.',
  FORBIDDEN: 'You are not authorized. Please log in again.',
  GENERIC: 'Something went wrong. Please try again.',
  SCHEMA_OUT_OF_DATE: 'The service is temporarily unavailable. Please try again later.',
  SUBSCRIPTION: 'Your school subscription needs attention. Open Billing on the web portal.',
} as const

const TECH_RE =
  /prisma|postgres|neon\.tech|econnrefused|stack trace|sqlstate|typeerror|relation \".+\" does not exist|column \".+\"|P202[12]|staff only|your role|insufficient role|signed in as a/i

export function userFacingFromHttp(
  status: number,
  body?: { code?: string; error?: string; message?: string } | null,
  fallback: string = ERROR_MESSAGES.GENERIC
): string {
  const code = String(body?.code || '').toUpperCase()
  if (
    [
      'PLAN_EXPIRED',
      'PLAN_UPGRADE_REQUIRED',
      'UPGRADE_REQUIRED',
      'SUBSCRIPTION_EXPIRED',
      'AI_LIMIT_REACHED',
      'AI_QUOTA_EXCEEDED',
      'STUDENT_CAP_REACHED',
    ].includes(code)
  ) {
    return ERROR_MESSAGES.SUBSCRIPTION
  }
  if (code === 'DB_SCHEMA_OUT_OF_DATE') return ERROR_MESSAGES.SCHEMA_OUT_OF_DATE

  if (status === 401) return ERROR_MESSAGES.SESSION_EXPIRED
  if (status === 403) return ERROR_MESSAGES.FORBIDDEN
  if (status === 404) return ERROR_MESSAGES.GENERIC
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status === 503) return ERROR_MESSAGES.SCHEMA_OUT_OF_DATE
  if (status >= 500) return ERROR_MESSAGES.SERVER_ERROR

  const raw = String(body?.message || body?.error || '').trim()
  if (!raw || TECH_RE.test(raw) || raw.length > 160) return fallback
  return raw
}
