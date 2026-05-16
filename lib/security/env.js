/**
 * Production environment validation (call at server startup).
 */

const WEAK_SECRETS = new Set([
  'dev-only-fallback-replace-in-prod',
  'dev-only-refresh-fallback',
  'your-secret-key',
  'changeme',
  'secret',
])

function isWeakSecret(value) {
  const v = String(value || '').trim()
  if (v.length < 32) return true
  if (WEAK_SECRETS.has(v)) return true
  return false
}

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return { ok: true, warnings: [] }

  const errors = []
  const warnings = []

  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
  for (const key of required) {
    if (!String(process.env[key] || '').trim()) {
      errors.push(`Missing required environment variable: ${key}`)
    }
  }

  if (isWeakSecret(process.env.JWT_SECRET)) {
    errors.push('JWT_SECRET must be at least 32 characters and not a default value')
  }
  if (isWeakSecret(process.env.JWT_REFRESH_SECRET)) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters and not a default value')
  }

  if (!process.env.NEXT_PUBLIC_APP_ORIGIN && !process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push('Set NEXT_PUBLIC_APP_ORIGIN or NEXT_PUBLIC_APP_URL for correct CORS and cookies')
  }

  if (errors.length) {
    console.error('[security] Production environment check failed:')
    for (const e of errors) console.error(`  - ${e}`)
    if (process.env.ENFORCE_PRODUCTION_SECRETS === 'true') {
      throw new Error('Production security requirements not met. Fix environment variables.')
    }
  }

  if (warnings.length) {
    console.warn('[security] Production warnings:')
    for (const w of warnings) console.warn(`  - ${w}`)
  }

  return { ok: errors.length === 0, errors, warnings }
}
