/**
 * Shared Sentry options for client, server, and edge runtimes.
 * DSN is read from env — never hardcode secrets in source files.
 */

/** @returns {string | undefined} */
export function getSentryDsn() {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined
}

/** @returns {boolean} */
export function isSentryEnabled() {
  return process.env.NODE_ENV === 'production' && Boolean(getSentryDsn())
}

/**
 * Base init options shared across runtimes.
 * @returns {import('@sentry/nextjs').BrowserOptions}
 */
export function getBaseSentryOptions() {
  return {
    dsn: getSentryDsn(),
    environment: process.env.NODE_ENV,
    enabled: isSentryEnabled(),
    tracesSampleRate: 0.1,
    enableLogs: true,
    sendDefaultPii: false,
    ignoreErrors: ['ResizeObserver loop limit exceeded', 'Non-Error promise rejection captured'],
  }
}
