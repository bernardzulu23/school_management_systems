/**
 * Security / ops alerting hooks.
 * Emits structured logs + Sentry events tagged for aggregator alert rules.
 *
 * Configure thresholds via env (defaults are production-safe starting points):
 *   ALERT_LOGIN_FAIL_COUNT / ALERT_LOGIN_FAIL_WINDOW_MS / ALERT_LOGIN_FAIL_SCHOOLS
 *   ALERT_SMS_FAIL_COUNT / ALERT_SMS_FAIL_WINDOW_MS
 *   ALERT_PAYMENT_WEBHOOK_FAIL_COUNT / ALERT_PAYMENT_WEBHOOK_FAIL_WINDOW_MS
 *   ALERT_CROSS_TENANT_COUNT / ALERT_CROSS_TENANT_WINDOW_MS
 */
import { LRUCache } from 'lru-cache'
import { captureWarning, createRouteLogger } from '@/lib/utils/logger'
import { sanitizeLogContext } from '@/lib/observability/piiScrub'

const windows = new LRUCache({ max: 500, ttl: 60 * 60 * 1000 })

function envInt(name, fallback) {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export const ALERT_THRESHOLDS = {
  loginFailCount: () => envInt('ALERT_LOGIN_FAIL_COUNT', 25),
  loginFailWindowMs: () => envInt('ALERT_LOGIN_FAIL_WINDOW_MS', 10 * 60 * 1000),
  loginFailDistinctSchools: () => envInt('ALERT_LOGIN_FAIL_SCHOOLS', 3),
  smsFailCount: () => envInt('ALERT_SMS_FAIL_COUNT', 15),
  smsFailWindowMs: () => envInt('ALERT_SMS_FAIL_WINDOW_MS', 5 * 60 * 1000),
  paymentWebhookFailCount: () => envInt('ALERT_PAYMENT_WEBHOOK_FAIL_COUNT', 5),
  paymentWebhookFailWindowMs: () => envInt('ALERT_PAYMENT_WEBHOOK_FAIL_WINDOW_MS', 15 * 60 * 1000),
  crossTenantCount: () => envInt('ALERT_CROSS_TENANT_COUNT', 1),
  crossTenantWindowMs: () => envInt('ALERT_CROSS_TENANT_WINDOW_MS', 5 * 60 * 1000),
}

/**
 * @param {string} key
 * @param {number} windowMs
 * @returns {{ count: number, meta: Record<string, unknown>, schools: Set<string> }}
 */
function bump(key, windowMs) {
  const now = Date.now()
  let entry = windows.get(key)
  if (!entry || now - entry.startedAt >= windowMs) {
    entry = { startedAt: now, count: 0, schools: new Set(), meta: {} }
  }
  entry.count += 1
  windows.set(key, entry, { ttl: windowMs + 60_000 })
  return entry
}

/**
 * Fire an alert once per window key (dedupe spam).
 * @param {string} alertType
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
function emitAlert(alertType, message, context = {}) {
  const safe = sanitizeLogContext({ ...context, alertType })
  const log = createRouteLogger({ route: 'observability/alerts', ...safe })
  log.warn(message, safe)

  captureWarning(message, {
    ...safe,
    sentryAlert: alertType,
    fingerprint: `zsms-alert:${alertType}`,
  })
}

/**
 * Record a failed login (no email/PII — hash or omit).
 * Alerts when volume is high across multiple tenants.
 * @param {{ schoolId?: string | null, ipHash?: string | null, reason?: string }} opts
 */
export function recordFailedLoginAlert(opts = {}) {
  const schoolId = opts.schoolId ? String(opts.schoolId) : 'unknown'
  const windowMs = ALERT_THRESHOLDS.loginFailWindowMs()
  const entry = bump('login_fail:global', windowMs)
  entry.schools.add(schoolId)

  const log = createRouteLogger({
    schoolId: schoolId === 'unknown' ? null : schoolId,
    route: 'auth/login',
  })
  log.info('login_failed', {
    event: 'login_failed',
    reason: opts.reason || 'invalid_credentials',
    ipHash: opts.ipHash || undefined,
  })

  if (
    entry.count >= ALERT_THRESHOLDS.loginFailCount() &&
    entry.schools.size >= ALERT_THRESHOLDS.loginFailDistinctSchools()
  ) {
    const dedupeKey = `alerted:login_fail:${entry.startedAt}`
    if (!windows.get(dedupeKey)) {
      windows.set(dedupeKey, true, { ttl: windowMs })
      emitAlert('repeated_failed_logins', 'Repeated failed logins across tenants', {
        failCount: entry.count,
        distinctSchools: entry.schools.size,
        windowMs,
      })
    }
  }
}

/**
 * @param {{ schoolId?: string | null, reason?: string | null, provider?: string | null }} opts
 */
export function recordSmsFailureAlert(opts = {}) {
  const schoolId = opts.schoolId ? String(opts.schoolId) : null
  const windowMs = ALERT_THRESHOLDS.smsFailWindowMs()
  const entry = bump('sms_fail:global', windowMs)
  if (schoolId) entry.schools.add(schoolId)

  if (entry.count >= ALERT_THRESHOLDS.smsFailCount()) {
    const dedupeKey = `alerted:sms_fail:${entry.startedAt}`
    if (!windows.get(dedupeKey)) {
      windows.set(dedupeKey, true, { ttl: windowMs })
      emitAlert('sms_send_failures', 'SMS send failures above threshold', {
        failCount: entry.count,
        distinctSchools: entry.schools.size,
        windowMs,
        lastReason: opts.reason || undefined,
        provider: opts.provider || undefined,
      })
    }
  }
}

/**
 * @param {{ kind?: string, reason?: string | null }} opts
 */
export function recordPaymentWebhookFailureAlert(opts = {}) {
  const windowMs = ALERT_THRESHOLDS.paymentWebhookFailWindowMs()
  const entry = bump('payment_webhook_fail:global', windowMs)

  if (entry.count >= ALERT_THRESHOLDS.paymentWebhookFailCount()) {
    const dedupeKey = `alerted:payment_webhook:${entry.startedAt}`
    if (!windows.get(dedupeKey)) {
      windows.set(dedupeKey, true, { ttl: windowMs })
      emitAlert('payment_webhook_failures', 'Payment webhook failures above threshold', {
        failCount: entry.count,
        windowMs,
        kind: opts.kind || 'lipila',
        reason: opts.reason || undefined,
      })
    }
  }

  // Always log individual webhook auth/process failures for forensics (no PII).
  createRouteLogger({ route: 'payments/webhook' }).warn('payment_webhook_failure', {
    event: 'payment_webhook_failure',
    kind: opts.kind || 'lipila',
    reason: opts.reason || undefined,
  })
}

/**
 * Unusual cross-tenant query pattern (caller where.schoolId ≠ tenant scope).
 * @param {{
 *   model?: string
 *   operation?: string
 *   expectedSchoolId?: string
 *   attemptedSchoolId?: string
 * }} opts
 */
export function recordCrossTenantQueryAlert(opts = {}) {
  const windowMs = ALERT_THRESHOLDS.crossTenantWindowMs()
  const entry = bump('cross_tenant:global', windowMs)

  createRouteLogger({
    schoolId: opts.expectedSchoolId || null,
    route: 'tenant/guard',
  }).warn('cross_tenant_query_attempt', {
    event: 'cross_tenant_query_attempt',
    model: opts.model,
    operation: opts.operation,
    // Do not log both IDs as a pair that maps pupils — only presence of mismatch.
    mismatch: true,
  })

  if (entry.count >= ALERT_THRESHOLDS.crossTenantCount()) {
    const dedupeKey = `alerted:cross_tenant:${Math.floor(Date.now() / windowMs)}`
    if (!windows.get(dedupeKey)) {
      windows.set(dedupeKey, true, { ttl: windowMs })
      emitAlert('cross_tenant_query', 'Unusual cross-tenant query pattern detected', {
        failCount: entry.count,
        windowMs,
        model: opts.model,
        operation: opts.operation,
      })
    }
  }
}

/** @internal */
export function resetObservabilityAlertsForTests() {
  windows.clear()
}
