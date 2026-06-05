/**
 * Environment variable validation for ZSMS.
 *
 * Runs at startup. If any required variable is missing, the app
 * throws a clear error message instead of a cryptic 500 at runtime.
 *
 * HOW IT WORKS:
 * - Import this file at the top of app/layout.js (server component)
 * - It reads process.env and validates each variable
 * - Missing required vars throw with a helpful message
 * - Optional vars log a warning in non-production
 *
 * ADDING NEW VARS:
 * - Add to REQUIRED or OPTIONAL object below
 * - Add a description so future devs know what it does
 */

import { validateProductionEnv } from '@/lib/security/env'

const REQUIRED = {
  DATABASE_URL: 'Neon PostgreSQL connection string',
  JWT_SECRET: 'Secret for signing JWT tokens (min 32 chars)',
  RESEND_API_KEY: 'Resend email API key (re_...)',
}

const OPTIONAL = {
  EMAIL_FROM: 'From address for emails (alias for noreply if EMAIL_FROM_NOREPLY unset)',
  EMAIL_FROM_NOREPLY: 'Noreply from address (e.g. ZSMS <noreply@yourdomain.com>)',
  EMAIL_INFO: 'Public enquiries inbox for contact form',
  JWT_REFRESH_SECRET:
    'Refresh token secret (min 32 chars) — required for secure production sessions',
  LIPILA_API_KEY: 'Lipila mobile money API key — payments disabled if missing',
  LIPILA_SECRET_KEY: 'Alias for LIPILA_API_KEY',
  LIPILA_BASE_URL: 'Lipila API base URL — defaults by NODE_ENV',
  AFRICASTALKING_API_KEY: "Africa's Talking API key — SMS disabled if missing",
  AFRICASTALKING_USERNAME: "Africa's Talking username",
  QSTASH_TOKEN: 'Upstash QStash token — bulk SMS broadcast disabled if missing',
  QSTASH_CURRENT_SIGNING_KEY: 'QStash signature verification (current key)',
  QSTASH_NEXT_SIGNING_KEY: 'QStash signature verification (next key)',
  QSTASH_CALLBACK_URL: 'Public HTTPS base URL for QStash worker callbacks',
  COOKIE_DOMAIN: 'Cookie domain for multi-tenant subdomains',
  APP_BASE_DOMAIN: 'Base domain (e.g. bluepeacktechnologies.com)',
  BASE_DOMAIN: 'Alias for APP_BASE_DOMAIN',
  DIRECT_URL: 'Neon direct connection URL for migrations',
  ALLOW_DIRECT_SCHOOL_REGISTRATION: 'Set to "true" to allow direct registration (dev only)',
  NEXT_PUBLIC_APP_ORIGIN: 'Public app origin for CORS and links',
  NEXT_PUBLIC_APP_URL: 'Alias for NEXT_PUBLIC_APP_ORIGIN',
  SENTRY_DSN: 'Sentry server DSN (optional monitoring)',
  NEXT_PUBLIC_SENTRY_DSN: 'Sentry browser DSN',
  GROQ_API_KEY: 'Groq AI API key (gsk_...) — primary, free tier 14,400 req/day',
  GEMINI_API_KEY: 'Google Gemini API key — free fallback from aistudio.google.com',
}

/**
 * Returns true when a usable email From address is configured.
 * @returns {boolean}
 */
export function hasEmailFromConfigured() {
  return Boolean(String(process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || '').trim())
}

/**
 * Validates required and optional environment variables.
 * Throws on missing required configuration; warns on missing optional keys in development.
 */
export function validateEnv() {
  const missing = []
  const warnings = []

  for (const [key, description] of Object.entries(REQUIRED)) {
    if (!String(process.env[key] || '').trim()) {
      missing.push(`  ❌ ${key} — ${description}`)
    }
  }

  if (!hasEmailFromConfigured()) {
    missing.push(
      '  ❌ EMAIL_FROM or EMAIL_FROM_NOREPLY — From address for transactional email (must be verified in Resend)'
    )
  }

  const hasGroq = Boolean(String(process.env.GROQ_API_KEY || '').trim())
  const hasGemini = Boolean(String(process.env.GEMINI_API_KEY || '').trim())
  if (!hasGroq && !hasGemini) {
    missing.push(
      '  ❌ GROQ_API_KEY or GEMINI_API_KEY — at least one AI provider key is required for AI features'
    )
  }

  const jwtSecret = String(process.env.JWT_SECRET || '').trim()
  if (jwtSecret && jwtSecret.length < 32) {
    missing.push('  ❌ JWT_SECRET — must be at least 32 characters')
  }

  for (const [key, description] of Object.entries(OPTIONAL)) {
    if (!String(process.env[key] || '').trim()) {
      warnings.push(`  ⚠️  ${key} — ${description} (feature disabled or default)`)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n\nZSMS startup failed — missing required environment variables:\n${missing.join('\n')}\n\nAdd these to your .env.local file or Vercel environment settings.\nSee docs/ENVIRONMENT.md for the full variable reference.\n`
    )
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `\nZSMS optional env vars not set (some features will be disabled):\n${warnings.join('\n')}\n`
    )
  }

  if (process.env.NODE_ENV === 'production') {
    validateProductionEnv()
  }
}

function defaultLipilaBaseUrl() {
  return process.env.NODE_ENV === 'production' ? 'https://blz.lipila.io' : 'https://api.lipila.dev'
}

/** Typed, validated environment accessors and feature flags. */
export const env = {
  // Auth
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  cookieDomain: process.env.COOKIE_DOMAIN,

  // Email
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM,
  emailInfo: process.env.EMAIL_INFO,

  // AI (Groq primary — FREE tier, 14,400 req/day; Gemini fallback — FREE tier)
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL,
  geminiApiKey: process.env.GEMINI_API_KEY,

  // Payments
  lipilaApiKey: process.env.LIPILA_API_KEY || process.env.LIPILA_SECRET_KEY,
  lipilaBaseUrl: process.env.LIPILA_BASE_URL || defaultLipilaBaseUrl(),

  // SMS
  atApiKey: process.env.AFRICASTALKING_API_KEY,
  atUsername: process.env.AFRICASTALKING_USERNAME,

  // App
  baseDomain: process.env.APP_BASE_DOMAIN || process.env.BASE_DOMAIN,
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Feature flags (derived from presence of API keys)
  features: {
    payments: Boolean(process.env.LIPILA_API_KEY || process.env.LIPILA_SECRET_KEY),
    sms: Boolean(process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME),
    ai: Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY),
    email: Boolean(process.env.RESEND_API_KEY && hasEmailFromConfigured()),
  },
}
