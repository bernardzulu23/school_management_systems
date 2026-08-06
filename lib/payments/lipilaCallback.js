import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { idString } from '@/lib/schemas'
import { secretsEqual, verifySharedWebhookSecret } from '@/lib/security/webhookAuth'

const refString = z.string().trim().min(1).max(256)
const statusString = z.string().trim().max(64)
const currencyString = z.string().trim().min(3).max(8)
const amountSchema = z.union([z.number(), z.string().trim().min(1).max(32)])

/**
 * Validate a single candidate field. Non-string objects (e.g. `{ $ne: null }`) fail closed.
 * @returns {{ error: true, field: string } | { value: string | null }}
 */
function pickTypedField(obj, keys, schema) {
  for (const key of keys) {
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) continue
    const val = obj[key]
    if (val === null || val === undefined || val === '') continue
    const parsed = schema.safeParse(val)
    if (!parsed.success) {
      return { error: true, field: key }
    }
    return { value: parsed.data }
  }
  return { value: null }
}

function pickAmount(obj, keys) {
  for (const key of keys) {
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) continue
    const val = obj[key]
    if (val === null || val === undefined || val === '') continue
    const parsed = amountSchema.safeParse(val)
    if (!parsed.success) return { error: true, field: key }
    const n = Number(parsed.data)
    if (!Number.isFinite(n)) return { error: true, field: key }
    return { value: n }
  }
  return { value: null }
}

/**
 * Parse Lipila webhook JSON into typed fields for activation + amount cross-check.
 *
 * @param {unknown} raw
 * @returns {{
 *   ok: true,
 *   identifier: string | null,
 *   referenceId: string | null,
 *   status: string,
 *   amount: number | null,
 *   currency: string | null,
 *   eventId: string | null,
 * } | { ok: false, error: string }}
 */
export function parseLipilaCallbackPayload(raw) {
  if (raw === null || raw === undefined) {
    return {
      ok: true,
      identifier: null,
      referenceId: null,
      status: '',
      amount: null,
      currency: null,
      eventId: null,
    }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid callback payload' }
  }

  const body = /** @type {Record<string, unknown>} */ (raw)
  const nested =
    body.data && typeof body.data === 'object' && !Array.isArray(body.data)
      ? /** @type {Record<string, unknown>} */ (body.data)
      : null

  const idPick = pickTypedField(body, ['identifier', 'internalId', 'internal_id'], idString)
  if (idPick.error) return { ok: false, error: 'Invalid callback payload' }
  let identifier = idPick.value
  if (!identifier && nested) {
    const nestedId = pickTypedField(nested, ['identifier', 'internalId', 'internal_id'], idString)
    if (nestedId.error) return { ok: false, error: 'Invalid callback payload' }
    identifier = nestedId.value
  }

  const refPick = pickTypedField(body, ['referenceId', 'reference_id'], refString)
  if (refPick.error) return { ok: false, error: 'Invalid callback payload' }
  let referenceId = refPick.value
  if (!referenceId && nested) {
    const nestedRef = pickTypedField(nested, ['referenceId', 'reference_id'], refString)
    if (nestedRef.error) return { ok: false, error: 'Invalid callback payload' }
    referenceId = nestedRef.value
  }

  const statusPick = pickTypedField(body, ['status'], statusString)
  if (statusPick.error) return { ok: false, error: 'Invalid callback payload' }
  let status = statusPick.value || ''
  if (!status && nested) {
    const nestedStatus = pickTypedField(nested, ['status'], statusString)
    if (nestedStatus.error) return { ok: false, error: 'Invalid callback payload' }
    status = nestedStatus.value || ''
  }

  const amountPick = pickAmount(body, ['amount', 'paidAmount', 'paid_amount', 'transactionAmount'])
  if (amountPick.error) return { ok: false, error: 'Invalid callback payload' }
  let amount = amountPick.value
  if (amount == null && nested) {
    const nestedAmount = pickAmount(nested, [
      'amount',
      'paidAmount',
      'paid_amount',
      'transactionAmount',
    ])
    if (nestedAmount.error) return { ok: false, error: 'Invalid callback payload' }
    amount = nestedAmount.value
  }

  const currencyPick = pickTypedField(
    body,
    ['currency', 'currencyCode', 'currency_code'],
    currencyString
  )
  if (currencyPick.error) return { ok: false, error: 'Invalid callback payload' }
  let currency = currencyPick.value
  if (!currency && nested) {
    const nestedCurrency = pickTypedField(
      nested,
      ['currency', 'currencyCode', 'currency_code'],
      currencyString
    )
    if (nestedCurrency.error) return { ok: false, error: 'Invalid callback payload' }
    currency = nestedCurrency.value
  }

  const eventPick = pickTypedField(
    body,
    ['eventId', 'event_id', 'webhookId', 'webhook_id', 'transactionId', 'transaction_id'],
    refString
  )
  if (eventPick.error) return { ok: false, error: 'Invalid callback payload' }
  let eventId = eventPick.value
  if (!eventId && nested) {
    const nestedEvent = pickTypedField(
      nested,
      ['eventId', 'event_id', 'webhookId', 'webhook_id', 'transactionId', 'transaction_id'],
      refString
    )
    if (nestedEvent.error) return { ok: false, error: 'Invalid callback payload' }
    eventId = nestedEvent.value
  }

  return {
    ok: true,
    identifier,
    referenceId,
    status: String(status || '').trim(),
    amount,
    currency: currency ? String(currency).trim().toUpperCase() : null,
    eventId,
  }
}

function hmacHex(secret, rawBody) {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

function signaturesEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8')
  const right = Buffer.from(String(b || ''), 'utf8')
  if (left.length === 0 || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * Enforce Lipila webhook auth before any payment mutation.
 * - Always requires LIPILA_WEBHOOK_SECRET (shared secret).
 * - Optional HMAC of raw body when LIPILA_WEBHOOK_HMAC_SECRET is set
 *   (header: x-lipila-signature / x-webhook-signature, hex sha256).
 * - When LIPILA_REQUIRE_HMAC=true, signature header is mandatory.
 *
 * @param {Request} request
 * @param {string} rawBody
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function verifyLipilaWebhookRequest(request, rawBody = '') {
  const shared = verifySharedWebhookSecret(request, 'LIPILA_WEBHOOK_SECRET', {
    aliasHeaders: ['x-lipila-webhook-secret'],
  })
  if (!shared.ok) return shared

  const hmacSecret = String(process.env.LIPILA_WEBHOOK_HMAC_SECRET || '').trim()
  const requireHmac = String(process.env.LIPILA_REQUIRE_HMAC || '').toLowerCase() === 'true'
  const signature = String(
    request.headers.get('x-lipila-signature') || request.headers.get('x-webhook-signature') || ''
  )
    .trim()
    .replace(/^sha256=/i, '')

  if (requireHmac && !hmacSecret) {
    return { ok: false, status: 503, error: 'LIPILA_WEBHOOK_HMAC_SECRET is not configured' }
  }

  if (requireHmac && !signature) {
    return { ok: false, status: 401, error: 'Missing webhook signature' }
  }

  if (hmacSecret && signature) {
    const expected = hmacHex(hmacSecret, String(rawBody || ''))
    if (!signaturesEqual(expected, signature) && !secretsEqual(expected, signature)) {
      return { ok: false, status: 401, error: 'Invalid webhook signature' }
    }
  } else if (hmacSecret && !signature && requireHmac) {
    return { ok: false, status: 401, error: 'Missing webhook signature' }
  }

  return { ok: true }
}
