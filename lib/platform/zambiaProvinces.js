/**
 * Ten provinces of Zambia — used for school onboarding and platform reporting.
 */
export const ZAMBIA_PROVINCES = [
  'Central',
  'Copperbelt',
  'Eastern',
  'Luapula',
  'Lusaka',
  'Muchinga',
  'Northern',
  'North-Western',
  'Southern',
  'Western',
]

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidZambiaProvince(value) {
  const v = String(value || '').trim()
  if (!v) return true
  return ZAMBIA_PROVINCES.some((p) => p.toLowerCase() === v.toLowerCase())
}

/**
 * @param {string} value
 * @returns {string | null}
 */
export function normalizeZambiaProvince(value) {
  const v = String(value || '').trim()
  if (!v) return null
  const match = ZAMBIA_PROVINCES.find((p) => p.toLowerCase() === v.toLowerCase())
  return match || v
}
