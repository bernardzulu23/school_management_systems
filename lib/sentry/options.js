/**
 * Shared Sentry options for client, server, and edge runtimes.
 * DSN is read from env — never hardcode secrets in source files.
 */

/** Browser extension / wallet noise — not application bugs. */
const EXTENSION_IGNORE_PATTERNS = [
  /MetaMask/i,
  /Failed to connect to MetaMask/i,
  /ethereum\.request/i,
  /wallet extension not found/i,
  /inpage\.js/i,
  /contentscript\.js/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /Could not establish connection\. Receiving end does not exist/i,
  /message port closed before a response was received/i,
  /Extension context invalidated/i,
  /listener indicated an asynchronous response/i,
]

/**
 * Drop events caused by browser extensions (MetaMask, ad blockers, etc.).
 * @param {import('@sentry/types').Event} event
 * @returns {import('@sentry/types').Event | null}
 */
export function sentryBeforeSend(event) {
  const message = String(event?.message || event?.exception?.values?.[0]?.value || '')
  const stack =
    event?.exception?.values
      ?.map((v) => v.stacktrace?.frames?.map((f) => f.filename).join(' ') || '')
      .join(' ') || ''

  const haystack = `${message} ${stack}`
  if (EXTENSION_IGNORE_PATTERNS.some((re) => re.test(haystack))) {
    return null
  }
  return event
}

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
    beforeSend: sentryBeforeSend,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'MetaMask extension not found',
      'Failed to connect to MetaMask',
      /Could not establish connection/,
      /Receiving end does not exist/,
      /message port closed before a response was received/,
      /Extension context invalidated/,
    ],
  }
}
