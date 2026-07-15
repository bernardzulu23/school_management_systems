/**
 * Short-lived twin secondary-auth tickets (Prompt 23).
 * Issued only after server-side PIN verification; consumed by attendance marks.
 * Replaces client-asserted secondaryVerified / biometricVerified booleans.
 */

import crypto from 'crypto'

const TTL_MS = 5 * 60 * 1000

function secret() {
  const s = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!s) {
    // Fail closed in production-shaped envs; still sign in dev so local works
    return 'zsms-dev-twin-auth-insecure'
  }
  return String(s)
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(b64, 'base64')
}

/**
 * @returns {{ twinAuthToken: string, expiresAt: string }}
 */
export function issueTwinAuthTicket({ schoolId, sessionId, studentId }) {
  const exp = Date.now() + TTL_MS
  const payload = {
    v: 1,
    schoolId: String(schoolId),
    sessionId: String(sessionId),
    studentId: String(studentId),
    exp,
  }
  const body = b64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', secret()).update(body).digest()
  return {
    twinAuthToken: `${body}.${b64url(sig)}`,
    expiresAt: new Date(exp).toISOString(),
  }
}

/**
 * @returns {{ ok: true, payload: object } | { ok: false, code: string, message: string }}
 */
export function verifyTwinAuthTicket(token, { schoolId, sessionId, studentId }) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return {
      ok: false,
      code: 'TWIN_AUTH_TOKEN_REQUIRED',
      message: 'Twin PIN verification ticket required',
    }
  }
  const [body, sigPart] = token.split('.')
  if (!body || !sigPart) {
    return { ok: false, code: 'TWIN_AUTH_TOKEN_INVALID', message: 'Invalid twin auth ticket' }
  }
  const expected = crypto.createHmac('sha256', secret()).update(body).digest()
  let actual
  try {
    actual = fromB64url(sigPart)
  } catch {
    return { ok: false, code: 'TWIN_AUTH_TOKEN_INVALID', message: 'Invalid twin auth ticket' }
  }
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { ok: false, code: 'TWIN_AUTH_TOKEN_INVALID', message: 'Invalid twin auth ticket' }
  }
  let payload
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8'))
  } catch {
    return { ok: false, code: 'TWIN_AUTH_TOKEN_INVALID', message: 'Invalid twin auth ticket' }
  }
  if (!payload || payload.v !== 1) {
    return { ok: false, code: 'TWIN_AUTH_TOKEN_INVALID', message: 'Invalid twin auth ticket' }
  }
  if (Number(payload.exp) < Date.now()) {
    return {
      ok: false,
      code: 'TWIN_AUTH_TOKEN_EXPIRED',
      message: 'Twin auth ticket expired — verify PIN again',
    }
  }
  if (
    String(payload.schoolId) !== String(schoolId) ||
    String(payload.sessionId) !== String(sessionId) ||
    String(payload.studentId) !== String(studentId)
  ) {
    return {
      ok: false,
      code: 'TWIN_AUTH_TOKEN_MISMATCH',
      message: 'Twin auth ticket does not match this mark',
    }
  }
  return { ok: true, payload }
}
