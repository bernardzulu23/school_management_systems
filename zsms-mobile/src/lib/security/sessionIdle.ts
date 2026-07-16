/**
 * Client idle session policy — parity with school_management_systems web app.
 * Server JWTs may still be valid; UI must clear the session after inactivity.
 */

export const IDLE_TIMEOUT_MS = 10 * 60 * 1000
export const IDLE_CHECK_INTERVAL_MS = 15 * 1000
export const IDLE_ACTIVITY_THROTTLE_MS = 2000
export const IDLE_LOGOUT_MESSAGE =
  'You were signed out after 10 minutes of inactivity. Please log in again.'

export function getIdleMs(lastActivityAt: number | null | undefined, now = Date.now()) {
  const last = Number(lastActivityAt) || 0
  if (last <= 0) return 0
  return Math.max(0, now - last)
}

/** Returns true only when a real activity timestamp exists and idle exceeds the limit. */
export function isIdleTimedOut(
  lastActivityAt: number | null | undefined,
  now = Date.now(),
  limitMs = IDLE_TIMEOUT_MS
) {
  const last = Number(lastActivityAt) || 0
  if (last <= 0) return false
  return now - last >= limitMs
}
