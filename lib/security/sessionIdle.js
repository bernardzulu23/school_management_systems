/**
 * Client idle session UX — server proxy enforces the real 10-minute boundary.
 * This module drives warning countdown + clear logout messaging only.
 */

export const IDLE_TIMEOUT_MS = 10 * 60 * 1000
/** Warn when ~1 minute of idle budget remains. */
export const IDLE_WARNING_MS = 9 * 60 * 1000
export const IDLE_CHECK_INTERVAL_MS = 15 * 1000
export const IDLE_ACTIVITY_THROTTLE_MS = 2000
export const IDLE_LOGOUT_MESSAGE = 'Signed out due to inactivity'
export const IDLE_WARNING_MESSAGE =
  "You'll be logged out due to inactivity — click to stay signed in"

export function getIdleMs(lastActivityAt, now = Date.now()) {
  const last = Number(lastActivityAt) || 0
  if (last <= 0) return 0
  return Math.max(0, now - last)
}

/** Returns true only when a real activity timestamp exists and idle exceeds the limit. */
export function isIdleTimedOut(lastActivityAt, now = Date.now(), limitMs = IDLE_TIMEOUT_MS) {
  const last = Number(lastActivityAt) || 0
  if (last <= 0) return false
  return now - last >= limitMs
}

export function shouldShowIdleWarning(lastActivityAt, now = Date.now()) {
  const last = Number(lastActivityAt) || 0
  if (last <= 0) return false
  const idle = now - last
  return idle >= IDLE_WARNING_MS && idle < IDLE_TIMEOUT_MS
}
