/**
 * Feature flags — defaults in code; override per deploy via Vercel env vars:
 * FEATURE_FLAG_HOD_BUDGET=true
 */
export const FEATURE_FLAGS = {
  HOD_BUDGET: true,
  HOD_CORRESPONDENCE: true,
  HOD_MEETINGS: true,
  HOD_MINUTES: true,
  HOD_STOCK_BOOK: true,
  HOD_STAFF_MEETINGS: true,
  HOD_DAILY_ROUTINE: true,
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
