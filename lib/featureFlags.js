/**
 * Feature flags — defaults in code; override per deploy via Vercel env vars:
 * FEATURE_FLAG_HOD_BUDGET=true
 */
export const FEATURE_FLAGS = {
  HOD_BUDGET: false,
  HOD_CORRESPONDENCE: false,
  HOD_MEETINGS: false,
  HOD_MINUTES: false,
  HOD_STOCK_BOOK: false,
  HOD_STAFF_MEETINGS: false,
  HOD_DAILY_ROUTINE: false,
  INNOVATION_HUB: true,
  MOBILE_APP_DOWNLOAD: true,
}

/** @typedef {keyof typeof FEATURE_FLAGS} FeatureFlag */

/**
 * @param {FeatureFlag} flag
 * @returns {boolean}
 */
export function isEnabled(flag) {
  const envKey = `FEATURE_FLAG_${flag}`
  const envVal = process.env[envKey]
  if (envVal === 'true') return true
  if (envVal === 'false') return false
  return Boolean(FEATURE_FLAGS[flag])
}
