/**
 * Shared Sentry options for client, server, and edge runtimes.
 * DSN is read from env — never hardcode secrets in source files.
 * PII scrubbing runs in beforeSend before events leave the process.
 */

import { scrubPiiDeep, scrubExceptionMessage, scrubStringValue } from '@/lib/observability/piiScrub'

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

function scrubUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return raw
  try {
    const u = new URL(raw)
    return `${u.origin}${u.pathname}`
  } catch {
    return raw.split('?')[0].split('#')[0]
  }
}

/**
 * @param {import('@sentry/types').Breadcrumb} breadcrumb
 */
export function sentryBeforeBreadcrumb(breadcrumb) {
  if (!breadcrumb || typeof breadcrumb !== 'object') return breadcrumb
  const data = breadcrumb.data
  if (data && typeof data === 'object') {
    if (data.url) data.url = scrubUrl(data.url)
    if (data.to) data.to = scrubUrl(data.to)
    if (data.from) data.from = scrubUrl(data.from)
    breadcrumb.data = scrubPiiDeep(data)
  }
  if (breadcrumb.message) {
    breadcrumb.message = scrubExceptionMessage(breadcrumb.message)
  }
  return breadcrumb
}

/**
 * Drop extension noise + scrub PII (student names/results/phones/emails) before send.
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

  if (event?.request) {
    if (event.request.url) event.request.url = scrubUrl(event.request.url)
    // Never forward cookies, auth headers, or query strings with tokens
    if (event.request.headers) {
      const headers = { ...event.request.headers }
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase()
        if (
          lower === 'cookie' ||
          lower === 'authorization' ||
          lower === 'x-csrf-token' ||
          lower.includes('token') ||
          lower.includes('secret')
        ) {
          headers[key] = '[redacted]'
        }
      }
      event.request.headers = headers
    }
    if (event.request.data) {
      event.request.data = scrubPiiDeep(event.request.data)
    }
    if (event.request.query_string) {
      event.request.query_string = ''
    }
    // Drop request body breadcrumbs that may contain form PII
    delete event.request.cookies
  }

  if (event.user) {
    // Keep opaque id only — never email/username/ip
    event.user = event.user.id ? { id: String(event.user.id) } : undefined
  }

  if (event.extra) {
    event.extra = scrubPiiDeep(event.extra)
  }
  if (event.contexts) {
    event.contexts = scrubPiiDeep(event.contexts)
  }

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = scrubExceptionMessage(ex.value)
    }
  }

  if (event.message) {
    event.message = scrubExceptionMessage(event.message)
  }

  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b) => {
      const next = { ...b }
      if (next.message) next.message = scrubStringValue(next.message)
      if (next.data) next.data = scrubPiiDeep(next.data)
      return next
    })
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
    initialScope: {
      tags: { service: 'zsms-api' },
    },
    tracesSampleRate: 0.1,
    enableLogs: true,
    sendDefaultPii: false,
    beforeSend: sentryBeforeSend,
    beforeBreadcrumb: sentryBeforeBreadcrumb,
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
