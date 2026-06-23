/**
 * Block NoSQL / query-operator injection in Prisma where clauses.
 * User-controlled values must be plain scalars (string/number/boolean/bigint),
 * never objects like `{ $ne: 5 }`.
 */

export function isPlainScalar(value) {
  if (value === null || value === undefined) return false
  const t = typeof value
  return t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint'
}

/**
 * @param {unknown} value
 * @param {{ maxLength?: number }} [options]
 * @returns {string | null}
 */
export function safeStringId(value, options = {}) {
  const { maxLength = 128 } = options
  if (!isPlainScalar(value)) return null
  const s = String(value).trim()
  if (!s || s.length > maxLength) return null
  if (s === '[object Object]') return null
  if (s.startsWith('{') || s.startsWith('[')) return null
  return s
}

/**
 * @param {unknown} value
 * @param {{ maxLength?: number, defaultValue?: string | null }} [options]
 * @returns {string | null}
 */
export function safeQueryString(value, options = {}) {
  const { maxLength = 256, defaultValue = null } = options
  if (value === undefined || value === null) return defaultValue
  return safeStringId(value, { maxLength }) ?? defaultValue
}

/**
 * @param {unknown} values
 * @param {{ maxLength?: number }} [options]
 * @returns {string[]}
 */
export function safeStringIds(values, options = {}) {
  if (!Array.isArray(values)) return []
  return values.map((v) => safeStringId(v, options)).filter(Boolean)
}

/**
 * @param {Record<string, unknown> | Promise<Record<string, unknown>>} params
 * @param {string} [paramName]
 * @returns {Promise<string | null>}
 */
export async function safeRouteParam(params, paramName = 'id') {
  const resolved = typeof params?.then === 'function' ? await params : params
  return safeStringId(resolved?.[paramName])
}

/**
 * Sanitize composite key fields before spreading into Prisma where.
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, string> | null}
 */
export function safeCompositeKey(fields) {
  const out = {}
  for (const [key, value] of Object.entries(fields || {})) {
    const safe = safeStringId(value, { maxLength: 256 })
    if (!safe) return null
    out[key] = safe
  }
  return out
}
