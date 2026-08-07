/**
 * Shared Zambian phone normalization for bulk upload schemas.
 * Defensive: Excel often stores phones as numbers and strips a leading 0.
 */

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeZambianPhoneInput(raw) {
  if (raw == null) return ''
  let s = String(raw).trim()
  if (!s) return ''

  // Excel numeric cells: 977994426 → restore leading 0 for local mobiles
  if (/^\d{9}$/.test(s) && !s.startsWith('0')) {
    s = `0${s}`
  }

  return s
}

export const ZAMBIAN_PHONE_REGEX = /^(\+?260|0)[0-9]{9}$/
