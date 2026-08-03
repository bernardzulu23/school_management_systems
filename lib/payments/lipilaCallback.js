import { z } from 'zod'
import { idString } from '@/lib/schemas'

const refString = z.string().trim().min(1).max(256)
const statusString = z.string().trim().max(64)

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

/**
 * Parse Lipila webhook JSON into typed strings for Prisma `where` clauses.
 * Rejects operator-style objects — does not coerce them with String().
 *
 * @param {unknown} raw
 * @returns {{ ok: true, identifier: string | null, referenceId: string | null, status: string }
 *   | { ok: false, error: string }}
 */
export function parseLipilaCallbackPayload(raw) {
  if (raw === null || raw === undefined) {
    return { ok: true, identifier: null, referenceId: null, status: '' }
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

  return {
    ok: true,
    identifier,
    referenceId,
    status: String(status || '').trim(),
  }
}
