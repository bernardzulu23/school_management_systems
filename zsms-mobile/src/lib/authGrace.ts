/** Grace window so post-login API races do not force logout. */
let lastAuthOkAt = 0

export function markAuthOkNow() {
  lastAuthOkAt = Date.now()
}

export function msSinceAuthOk() {
  return Date.now() - lastAuthOkAt
}

export function wasRecentlyAuthenticated(windowMs = 15_000) {
  return msSinceAuthOk() < windowMs
}
