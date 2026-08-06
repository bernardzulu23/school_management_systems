import crypto from 'crypto'

/**
 * HMAC binding so cron HTTP callers cannot target an arbitrary schoolId
 * with only CRON_SECRET — payload tenant must match the signed header.
 *
 * Header: x-zsms-cron-binding = hex(hmac-sha256(CRON_SECRET, `send-immediate:v1:${schoolId}:${userId}`))
 *
 * @param {string} schoolId
 * @param {string} userId
 * @param {string} [secret]
 */
export function createSendImmediateCronBinding(schoolId, userId, secret = process.env.CRON_SECRET) {
  const s = String(secret || '').trim()
  const sid = String(schoolId || '').trim()
  const uid = String(userId || '').trim()
  if (!s || !sid || !uid) return ''
  return crypto.createHmac('sha256', s).update(`send-immediate:v1:${sid}:${uid}`).digest('hex')
}

/**
 * @param {string} a
 * @param {string} b
 */
export function safeEqualHex(a, b) {
  const aa = String(a || '')
  const bb = String(b || '')
  if (!aa || !bb || aa.length !== bb.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(aa, 'utf8'), Buffer.from(bb, 'utf8'))
  } catch {
    return false
  }
}

/**
 * @param {Request} request
 * @param {string} schoolId
 * @param {string} userId
 */
export function verifySendImmediateCronBinding(request, schoolId, userId) {
  const provided = String(request.headers.get('x-zsms-cron-binding') || '').trim()
  const expected = createSendImmediateCronBinding(schoolId, userId)
  return Boolean(expected && provided && safeEqualHex(provided, expected))
}
