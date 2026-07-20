/**
 * Structured logger for ZSMS API routes and shared client utilities.
 *
 * WHY: console.log() produces unstructured output that is hard to search
 * in Vercel logs. Route loggers add context (schoolId, userId, route, duration)
 * so you can filter by school or user in production.
 *
 * USAGE (route handler):
 *   import { logger, captureError } from '@/lib/utils/logger';
 *   const log = logger({ schoolId, userId, route: '/api/lesson-plans' });
 *   const start = Date.now();
 *   log.request(request);
 *   // ... handler logic ...
 *   log.response(200, Date.now() - start);
 *
 * LEGACY (still supported):
 *   logger.info('message', { key: 'value' });
 *   logger.error('message', error, { url: request.url });
 */

const isDev = process.env.NODE_ENV !== 'production'

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'cookie',
  'refresh_token',
  'access_token',
  'passwordhash',
  'secret',
])

/**
 * Strip sensitive fields before logging or sending to Sentry.
 * @param {Record<string, unknown>} context
 * @returns {Record<string, unknown>}
 */
function sanitizeContext(context = {}) {
  const out = {}
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) continue
    out[key] = value
  }
  return out
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
    ...sanitizeContext(context),
    msg: message,
    ...sanitizeContext(data),
  }

  if (isDev) {
    const icon = { info: 'ℹ️', warn: '⚠️', error: '❌', debug: '🔍' }[level] || '•'
    const schoolTag =
      context.schoolId && typeof context.schoolId === 'string'
        ? `[${String(context.schoolId).slice(-6)}]`
        : ''
    const routeTag = context.route ? ` ${context.route}` : ''
    const extra = Object.keys(data).length ? data : ''
    if (level === 'error') {
      console.error(`${icon}${schoolTag}${routeTag} ${message}`, extra)
    } else if (level === 'warn') {
      console.warn(`${icon}${schoolTag}${routeTag} ${message}`, extra)
    } else {
      console.log(`${icon}${schoolTag}${routeTag} ${message}`, extra)
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
  const base = sanitizeContext(context)
  return {
    info: (message, data) => formatEntry('info', base, message, data),
    warn: (message, data) => formatEntry('warn', base, message, data),
    error: (message, data) => formatEntry('error', base, message, data),
    debug: (message, data) => isDev && formatEntry('debug', base, message, data),

    /** Log API request start — call at top of route handler */
    request: (req) =>
      formatEntry('info', base, `${req.method} ${base.route || ''}`, {
        userAgent: req.headers?.get?.('user-agent')?.slice(0, 50),
      }),

    /** Log API request completion — call before returning response */
    response: (status, durationMs) =>
      formatEntry('info', base, `Response ${status}`, {
        status,
        durationMs,
      }),
  }
}

/**
 * Capture error in Sentry with school context (production only).
 * Use this instead of console.error in API routes.
 *
 * @param {Error|unknown} error
 * @param {Record<string, unknown>} [context]
 */
export function captureError(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error))
  const safe = sanitizeContext(context)

  formatEntry('error', safe, err.message, {
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
          if (safe.schoolId) scope.setTag('schoolId', String(safe.schoolId))
          if (safe.userId) scope.setUser({ id: String(safe.userId) })
          if (safe.route) scope.setTag('route', String(safe.route))
          Object.entries(safe).forEach(([k, v]) => {
            if (k !== 'schoolId' && k !== 'userId' && k !== 'route') {
              scope.setExtra(k, v)
            }
          })
          Sentry.captureException(err)
        })
      })
      .catch(() => {
        // Sentry not configured — fail silently
      })
  }
}

/**
 * Capture a non-error warning in Sentry with context (production only).
 * Use for unexpected/actionable gaps (e.g. Form 1 teaching-module miss).
 * Do NOT use for expected coverage gaps — those page "recently active" members.
 *
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function captureWarning(message, context = {}) {
  const safe = sanitizeContext(context)

  formatEntry('warn', safe, message)

  if (
    typeof window === 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
  ) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (safe.schoolId) scope.setTag('schoolId', String(safe.schoolId))
          if (safe.route) scope.setTag('route', String(safe.route))
          Object.entries(safe).forEach(([k, v]) => {
            if (k !== 'schoolId' && k !== 'route') scope.setExtra(k, v)
          })
          Sentry.captureMessage(message, 'warning')
        })
      })
      .catch(() => {
        // Sentry not configured — fail silently
      })
  }
}

/**
 * Record an expected / non-actionable signal without paging Sentry.
 * Logs at info and (in production) adds a Sentry breadcrumb only — never
 * captureMessage/warning, so issue alerts and "notify recently active" stay quiet.
 *
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function captureInfo(message, context = {}) {
  const safe = sanitizeContext(context)

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
          message,
          level: 'info',
          data: safe,
        })
      })
      .catch(() => {
        // Sentry not configured — fail silently
      })
  }
}

/** Legacy singleton methods — used by errorHandler, api.js, React contexts */
const legacyLogger = {
  info: (message, data = {}) => formatEntry('info', {}, message, data),
  warn: (message, data = {}) => formatEntry('warn', {}, message, data),
  error: (message, error, context = {}) => {
    const merged = sanitizeContext(context)
    formatEntry('error', merged, message, {
      error: error?.message ?? String(error),
      stack: isDev && error?.stack ? error.stack : undefined,
    })
    if (error instanceof Error) captureError(error, merged)
  },
  debug: (message, data = {}) => isDev && formatEntry('debug', {}, message, data),
}

/**
 * Route logger factory: `logger({ schoolId, route })` → scoped logger.
 * Also exposes legacy `.info` / `.error` on the function object.
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
