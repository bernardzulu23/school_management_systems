# Phase 8 — Observability & incident response

**Date:** 2026-08-05  
**Scope:** Structured API logging, Sentry PII scrubbing, security/ops alerts, IR runbook

## Audit scorecard

| #   | Criterion                                                  | Pre-fix                                                | Post-fix                                                                    |
| --- | ---------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| 1   | Structured logs (requestId, schoolId, userId; no full PII) | **PARTIAL** — route logger existed; no requestId / ALS | **PASS** — `withErrorHandler` binds ALS; JSON lines in prod; `x-request-id` |
| 2   | Error tracking with PII scrubbing                          | **PARTIAL** — Sentry on; weak scrub                    | **PASS** — deep scrub of names/grades/phones/emails before send             |
| 3   | Alerting (logins, cross-tenant, SMS, payments)             | **FAIL** — counters only / silent                      | **PASS** — threshold alerts + Sentry `alert` tag                            |
| 4   | Incident response runbook                                  | **PARTIAL** — secret rotation only                     | **PASS** — `docs/INCIDENT_RESPONSE_RUNBOOK.md`                              |

## Code map

| Concern                   | Path                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Request ALS + header      | `lib/observability/requestContext.js`, `proxy.js`, `lib/middleware/errorHandler.js` |
| PII scrub (logs + Sentry) | `lib/observability/piiScrub.js`, `lib/sentry/options.js`, `lib/utils/logger.js`     |
| Alerts                    | `lib/observability/alerts.js`                                                       |
| Login fail hook           | `lib/security/loginBruteForce.js` → `recordFailedLoginAlert`                        |
| Cross-tenant hook         | `lib/prisma/tenantClient.js` → `recordCrossTenantQueryAlert`                        |
| SMS fail hook             | `lib/sms/sendOutbound.js` → `recordSmsFailureAlert`                                 |
| Payment webhook hook      | Lipila callbacks → `recordPaymentWebhookFailureAlert`                               |
| IR runbook                | `docs/INCIDENT_RESPONSE_RUNBOOK.md`                                                 |

## Log shape (production)

Each line is JSON, e.g.:

```json
{
  "level": "info",
  "timestamp": "2026-08-05T18:00:00.000Z",
  "service": "zsms-api",
  "requestId": "…",
  "schoolId": "…",
  "userId": "…",
  "route": "/api/students",
  "method": "GET",
  "msg": "Response 200",
  "event": "http_response",
  "status": 200,
  "durationMs": 42
}
```

Ship Vercel/runtime logs to your aggregator; filter on `service=zsms-api`, `alert=*`, or `event=login_failed`.

## Alert env knobs

| Env                                    | Default | Meaning                                      |
| -------------------------------------- | ------- | -------------------------------------------- |
| `ALERT_LOGIN_FAIL_COUNT`               | 25      | Failures in window                           |
| `ALERT_LOGIN_FAIL_SCHOOLS`             | 3       | Distinct schoolIds required                  |
| `ALERT_LOGIN_FAIL_WINDOW_MS`           | 600000  | 10 minutes                                   |
| `ALERT_SMS_FAIL_COUNT`                 | 15      | SMS failures in window                       |
| `ALERT_SMS_FAIL_WINDOW_MS`             | 300000  | 5 minutes                                    |
| `ALERT_PAYMENT_WEBHOOK_FAIL_COUNT`     | 5       | Webhook auth/parse/handler fails             |
| `ALERT_PAYMENT_WEBHOOK_FAIL_WINDOW_MS` | 900000  | 15 minutes                                   |
| `ALERT_CROSS_TENANT_COUNT`             | 1       | Mismatched `where.schoolId` on tenant client |
| `ALERT_CROSS_TENANT_WINDOW_MS`         | 300000  | 5 minutes                                    |

Sentry: create alert rules on tag `alert` ∈ `repeated_failed_logins` \| `sms_send_failures` \| `payment_webhook_failures` \| `cross_tenant_query`.

## Deploy notes

- No DB migration.
- Ensure `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` set in production (`sendDefaultPii: false`).
- Confirm aggregator ingests stdout JSON from Vercel.
