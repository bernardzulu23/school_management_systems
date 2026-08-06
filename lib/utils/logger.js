/**
 * Structured logger for ZSMS API routes and shared client utilities.
 *
 * Production emits one JSON line per event (shippable to any log aggregator).
 * Always includes requestId when available; schoolId/userId when bound — never full PII.
 */

import { getRequestContext } from '@/lib/observability/requestContext'
import { sanitizeLogContext, scrubExceptionMessage } from '@/lib/observability/piiScrub'

const isDev = process.env.NODE_ENV !== 'production'

function mergeContext(context = {}) {
  const req = getRequestContext() || {}
  return sanitizeLogContext({
    requestId: req.requestId,
    schoolId: context.schoolId ?? req.schoolId,
    userId: context.userId ?? req.userId,
    route: context.route ?? req.route,
    method: context.method ?? req.method,
    ...context,
  })
}

/**
 * @param {'info'|'warn'|'error'|'debug'} level
 * @param {Record<string, unknown>} context
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 */
function formatEntry(level, context, message, data = {}) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    service: 'zsms-api',
    ...mergeContext(context),
    msg: scrubExceptionMessage(message),
    ...sanitizeLogContext(data),
  }

  if (isDev) {
    const icon = { info: 'ℹ️', warn: '⚠️', error: '❌', debug: '🔍' }[level] || '•'
    const schoolTag =
      entry.schoolId && typeof entry.schoolId === 'string'
        ? `[${String(entry.schoolId).slice(-6)}]`
        : ''
    const rid = entry.requestId ? ` ${String(entry.requestId).slice(0, 8)}` : ''
    const routeTag = entry.route ? ` ${entry.route}` : ''
    const extra = Object.keys(data).length ? sanitizeLogContext(data) : ''
    if (level === 'error') {
      console.error(`${icon}${schoolTag}${rid}${routeTag} ${message}`, extra)
    } else if (level === 'warn') {
      console.warn(`${icon}${schoolTag}${rid}${routeTag} ${message}`, extra)
    } else {
      console.log(`${icon}${schoolTag}${rid}${routeTag} ${message}`, extra)
    }
  } else {
    console.log(JSON.stringify(entry))
  }
}

/**
 * Create a route-scoped logger with fixed context (schoolId, userId, route).
 * @param {Record<string, unknown>} [context]
 */
export function createRouteLogger(context = {}) {
  const base = sanitizeLogContext(context)
  return {
    info: (message, data) => formatEntry('info', base, message, data),
    warn: (message, data) => formatEntry('warn', base, message, data),
    error: (message, data) => formatEntry('error', base, message, data),
    debug: (message, data) => isDev && formatEntry('debug', base, message, data),

    request: (req) =>
      formatEntry('info', base, `${req.method} ${base.route || ''}`, {
        event: 'http_request',
        userAgent: req.headers?.get?.('user-agent')?.slice(0, 50),
      }),

    response: (status, durationMs) =>
      formatEntry('info', base, `Response ${status}`, {
        event: 'http_response',
        status,
        durationMs,
      }),
  }
}

/**
 * Capture error in Sentry with school context (production only).
 * @param {Error|unknown} error
 * @param {Record<string, unknown>} [context]
 */
export function captureError(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error))
  const safe = mergeContext(context)

  formatEntry('error', safe, scrubExceptionMessage(err.message), {
    stack: isDev ? err.stack : undefined,
    code: err.code,
  })

  if (
    typeof window === 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
  ) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (safe.requestId) scope.setTag('requestId', String(safe.requestId))
          if (safe.schoolId) scope.setTag('schoolId', String(safe.schoolId))
          if (safe.userId) scope.setUser({ id: String(safe.userId) })
          if (safe.route) scope.setTag('route', String(safe.route))
          Object.entries(safe).forEach(([k, v]) => {
            if (k !== 'schoolId' && k !== 'userId' && k !== 'route' && k !== 'requestId') {
              scope.setExtra(k, v)
            }
          })
          Sentry.captureException(err)
        })
      })
      .catch(() => {})
  }
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function captureWarning(message, context = {}) {
  const safe = mergeContext(context)

  formatEntry('warn', safe, message)

  if (
    typeof window === 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
  ) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (safe.requestId) scope.setTag('requestId', String(safe.requestId))
          if (safe.schoolId) scope.setTag('schoolId', String(safe.schoolId))
          if (safe.route) scope.setTag('route', String(safe.route))
          if (safe.sentryAlert) scope.setTag('alert', String(safe.sentryAlert))
          if (safe.fingerprint) scope.setFingerprint([String(safe.fingerprint)])
          Object.entries(safe).forEach(([k, v]) => {
            if (
              k !== 'schoolId' &&
              k !== 'route' &&
              k !== 'requestId' &&
              k !== 'sentryAlert' &&
              k !== 'fingerprint'
            ) {
              scope.setExtra(k, v)
            }
          })
          Sentry.captureMessage(scrubExceptionMessage(message), 'warning')
        })
      })
      .catch(() => {})
  }
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function captureInfo(message, context = {}) {
  const safe = mergeContext(context)

  formatEntry('info', safe, message)

  if (
    typeof window === 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
  ) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.addBreadcrumb({
          category: 'ai.fallback',
          message: scrubExceptionMessage(message),
          level: 'info',
          data: safe,
        })
      })
      .catch(() => {})
  }
}

const legacyLogger = {
  info: (message, data = {}) => formatEntry('info', {}, message, data),
  warn: (message, data = {}) => formatEntry('warn', {}, message, data),
  error: (message, error, context = {}) => {
    const merged = mergeContext(context)
    formatEntry('error', merged, message, {
      error: error?.message ?? String(error),
      stack: isDev && error?.stack ? error.stack : undefined,
    })
    if (error instanceof Error) captureError(error, merged)
  },
  debug: (message, data = {}) => isDev && formatEntry('debug', {}, message, data),
}

/**
 * @param {Record<string, unknown>} [context]
 */
export function logger(context) {
  if (context && typeof context === 'object') {
    return createRouteLogger(context)
  }
  return createRouteLogger({})
}

logger.info = legacyLogger.info
logger.warn = legacyLogger.warn
logger.error = legacyLogger.error
logger.debug = legacyLogger.debug

export default logger
