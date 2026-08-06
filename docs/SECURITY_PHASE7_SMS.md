# Phase 7 — SMS gateway security (Africa’s Talking + Android)

**Date:** 2026-08-05  
**Scope:** Gateway poll/info routes, pairing tokens, grades SMS cascade, SmsLog tenancy, AT/Mocean cutover

## Audit scorecard

| #   | Criterion                     | Pre-fix                                                     | Post-fix                                                                                                          |
| --- | ----------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `/api/sms/gateway/info` auth  | **PASS** — session + tenant required                        | **PASS** — tightened roles (no teacher); no fleet totals leak                                                     |
| 2   | Pairing / cross-school hijack | **PARTIAL** — hash OK; always-shared register               | **PASS\*** — dedicated `schoolId` bind supported; shared still multi-tenant by design with platform-only register |
| 3   | Grades SMS cascade race       | **PARTIAL** — lock exists; class-subjects fallback + TOCTOU | **PASS** — no class-subjects SMS fallback; re-verify under lock; concurrent test                                  |
| 4   | SmsLog tenant isolation       | **PARTIAL** — school OK; info leaked device totals          | **PASS** — school metrics only; platform logs optional `schoolId` filter                                          |
| 5   | AT vs Mocean dual-send        | **PASS** — Mocean unused at runtime                         | **PASS** — explicit no-Mocean guard + docs                                                                        |

\* A shared Android gateway token still sees all schools’ queued SMS for that device — intentional bridge design; mitigate by using dedicated gateways or rotating tokens on leak.

## Gaps fixed

1. School `info` no longer returns `gatewayDeviceSent/Failed` (cross-school fleet counters).
2. Register supports dedicated (non-shared) gateways bound to one `schoolId`.
3. Grades SMS: enrollments → selected_subjects only; re-check under lock; SMS body uses locked subject set.
4. Platform gateway logs accept `?schoolId=` to isolate shared-device views.
5. `sendOutboundSms` documents/asserts single-provider success path (no Mocean).

## Deploy

No schema migration required for Phase 7 code fixes (uses existing `SMSGateway.schoolId` / `isShared`).
