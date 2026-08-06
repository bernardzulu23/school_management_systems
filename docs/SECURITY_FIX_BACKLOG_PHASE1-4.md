# Security fix backlog — Phases 1–4 audit

Prioritized **Critical → High** only. Medium/Info deferred unless noted as a dependency.

**Status legend:** `todo` · `in_progress` · `done` · `wontfix` (with reason)

**Source audit:** multi-tenant SaaS scan of `/app/api` + `/lib` (unscoped Prisma, raw SQL, client `schoolId`, unauthenticated DB routes), plus Phase 1–4 residual gaps.

---

## Critical

### C1 — Stop unauthenticated global tenant aggregates

|            |                                                                                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done`                                                                                                                                                                                                                                                                 |
| **Risk**   | Any client can read platform-wide student/teacher/result counts (telemetry + competitive intel).                                                                                                                                                                       |
| **Files**  | `app/api/public/platform-stats/route.js` (~29–31); `lib/platform/schoolUsageStats.js` (~95–96)                                                                                                                                                                         |
| **Fix**    | Do not expose raw `prisma.student.count()` / `teacher.count()` / `result.count()` publicly. Prefer cached rounded/bucketed marketing stats, auth-gated platform admin only, or remove endpoint. Ensure `getPlatformUsageTotals()` is never called from a public route. |
| **Accept** | Unauthenticated GET returns no exact global PII-adjacent counts (or 401/404). Platform admin overview still works if needed.                                                                                                                                           |
| **Test**   | `curl` public URL without cookies → no real totals; platform admin path still OK.                                                                                                                                                                                      |

### C2 — Scope attendance bulk updates by `schoolId`

|            |                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done`                                                                                                                                                                                                                            |
| **Risk**   | Cross-tenant overwrite via `studentId_date` unique if another school’s `studentId` is supplied.                                                                                                                                   |
| **Files**  | `lib/attendance/bulkUpsert.js` (~35–38); all callers                                                                                                                                                                              |
| **Fix**    | Require `schoolId` on every update/create; use `updateMany({ where: { studentId, date, schoolId }, … })` or verify each `studentId` belongs to `schoolId` before write. Prefer `getTenantClient(schoolId)` / `withSchoolContext`. |
| **Accept** | Update for `studentId` outside tenant → 0 rows / error; no cross-school mutation.                                                                                                                                                 |
| **Test**   | Unit/integration: two schools, attempt update other school’s student → fail.                                                                                                                                                      |

### C3 — Scope fee payment webhook updates by tenant

|            |                                                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done`                                                                                                                                                                                                |
| **Risk**   | Compromised Lipila secret or known payment UUID/ref updates another school’s payment.                                                                                                                 |
| **Files**  | `lib/payments/feePayments.js` (~51–84); Lipila callback routes                                                                                                                                        |
| **Fix**    | Include `schoolId` in lookup/update when known from payment record / metadata; never `update` by `id` alone without asserting payment’s `schoolId` matches expected context. Log + reject mismatches. |
| **Accept** | Webhook cannot flip status of a payment whose `schoolId` ≠ callback context (or metadata).                                                                                                            |
| **Test**   | Fixture payments in school A/B; callback for A cannot complete B’s payment.                                                                                                                           |

---

## High

### H1 — AI / navbot: derive tenant from DB session, not JWT claim

|            |                                                                                                                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done`                                                                                                                                                                                                                                                         |
| **Risk**   | Stale/forged JWT `schoolId` scopes AI usage and tenant reads incorrectly.                                                                                                                                                                                      |
| **Files**  | `app/api/ai/report-comments/route.js:35`; `ecz-exam-questions:40`; `lesson-planner/route.ts:144`; `story-weaver:95`; `quiz-maker:80`; `project-maker:88`; `ecz-practice:62`; `phonics-trainer:22`; `competency-analyzer:22`; `app/api/chat/navbot/route.ts:25` |
| **Fix**    | Replace `user.schoolId` with `getTenantContext(request, user)` or `resolveAuthenticatedSchoolId`. Prefer `withApiHandler` + `feature` gates.                                                                                                                   |
| **Accept** | Every listed route uses DB-verified `schoolId`; JWT mismatch → 403.                                                                                                                                                                                            |
| **Test**   | Session with mismatched JWT school claim rejected; happy path still works.                                                                                                                                                                                     |

### H2 — SMS gateway queue/status: add `schoolId` defense-in-depth

|            |                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done`                                                                                                                      |
| **Risk**   | Stolen gateway token reads/updates logs for that device without school filter.                                              |
| **Files**  | `app/api/sms/gateway/queue/route.ts:33–68`; `app/api/sms/gateway/status/route.ts:41–55`                                     |
| **Fix**    | Always include `schoolId` from gateway record (or shared-gateway allowlist) in `smsLog` `where`/`update`. Keep device auth. |
| **Accept** | Queries never select/update logs with null/wrong school relative to gateway binding.                                        |
| **Test**   | Gateway A cannot flip status of log belonging to school/gateway B.                                                          |

### H3 — Cron `send-immediate`: do not trust body `schoolId` alone

|            |                                                                                                                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done`                                                                                                                                                                                                                                    |
| **Risk**   | Leaked `CRON_SECRET` + arbitrary body `schoolId` → cross-tenant notify.                                                                                                                                                                   |
| **Files**  | `app/api/notifications/send-immediate/route.js:26–28`                                                                                                                                                                                     |
| **Fix**    | Prefer signed job payload (QStash) with schoolId bound at enqueue time; or validate school exists + rate-limit + audit log; never accept schoolId from unsigned caller without secret _and_ additional binding. Document secret rotation. |
| **Accept** | Cron path cannot target arbitrary school without enqueue-time binding (or equivalent control).                                                                                                                                            |
| **Test**   | Forged body schoolId rejected or ignored when signature/binding missing.                                                                                                                                                                  |

### H4 — Enforce tenant Prisma client on sensitive write paths

|            |                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status** | `done`                                                                                                                                                                                                                               |
| **Risk**   | Missing `schoolId` in a single `where` = cross-tenant data access; extension unused.                                                                                                                                                 |
| **Files**  | ~758 baseline sites; prioritize: attendance, results, fees, students, SMS, parents                                                                                                                                                   |
| **Fix**    | Batch-migrate Critical/High domains to `getTenantContext` / `withApiHandler` / `ctx.db`. Expand `TENANT_SCOPED_MODELS` as needed. Reduce `check:tenant` baseline only when truly fixed (not `--update-baseline` unless intentional). |
| **Accept** | Attendance/results/fees/students API writes go through scoped client; new unscoped calls fail CI.                                                                                                                                    |
| **Test**   | `npm run check:tenant`; route smoke with wrong-school IDs.                                                                                                                                                                           |
| **Done**   | `GET/PUT/DELETE /api/students/[id]`, attendance POST bulk upsert, teacher results CRUD use `getTenantClient` / `withTenantRequest`.                                                                                                  |

### H5 — Deploy / wire RLS for Critical tables (ops + code)

|            |                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done` (code); Neon migrate deploy remains ops                                                                                                                                              |
| **Risk**   | Prisma bug still returns cross-tenant rows if RLS not active or GUC unset.                                                                                                                  |
| **Files**  | `prisma/migrations/20260528120000_enable_rls/`; `20260804120000_phase1_expand_rls/`; `lib/db/school-context.js`; `lib/tenant/context.js` (`withTenantRequest`)                              |
| **Fix**    | Confirm migrate deploy on Neon; wrap Critical paths with `withSchoolContext` / `withTenantRequest`; verify `zsms_app` least-privilege role ([`docs/NEON_DB_ROLES.md`](./NEON_DB_ROLES.md)). |
| **Accept** | With wrong/missing GUC, FORCE RLS tables return 0 rows for app role; happy path works.                                                                                                      |
| **Test**   | Staging: unset GUC → empty; set GUC → tenant rows only.                                                                                                                                     |
| **Done**   | `withTenantRequest` on student detail writes; `withSchoolContext` on class roster + attendance bulk. Apply SQL migrations on Neon when ready (see NEON_DB_ROLES).                           |

### H6 — Platform SMS metrics: keep admin-only + audit

|            |                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Status** | `done`                                                                                                                     |
| **Risk**   | Cross-tenant SMS aggregates (already `requirePlatformAdmin`).                                                              |
| **Files**  | `app/api/admin/sms-gateway-metrics/route.ts`                                                                               |
| **Fix**    | Confirm platform gate cannot be bypassed; add audit log on access; optional school filter query for least privilege views. |
| **Accept** | Non-platform user → 403; access logged.                                                                                    |
| **Test**   | School admin token → 403; platform → 200.                                                                                  |
| **Done**   | `logPiiAccess` on successful platform gate (`PlatformSmsGatewayMetrics`).                                                  |

---

## Suggested execution order

```
C1 → C2 → C3 → H1 → H2 → H3 → H5 (staging) → H4 (by domain) → H6
```

Do **not** enable FORCE RLS in production (H5) until C2/C3/H1/H4 sensitive paths set `app.current_school_id`.

---

## Out of scope for this backlog (Medium — track separately)

- National percentile intentional cross-tenant aggregate
- QR mark JWT-only writes
- `$queryRawUnsafe` → tagged template cleanup (already parameterized)
- Remaining `withApiHandler` migration (~437 routes)
- Cloudflare WAF rules 4–7 apply in dashboard
- Preview vs Production secret split verification

---

## Progress log

| Date       | Ticket | Note                                                                                                                                               |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-05 | —      | Backlog created from audit.                                                                                                                        |
| 2026-08-05 | **C1** | `done` — public platform-stats no longer queries Student/Teacher/Result; marketing ints via env; `getPlatformUsageTotals` uses per-school groupBy. |
| 2026-08-05 | **C2** | `done` — bulkUpsert verifies student ownership + `updateMany` with `schoolId`.                                                                     |
| 2026-08-05 | **C3** | `done` — `activateFeePayment` binds all updates to payment `schoolId`; optional expected `schoolId`; ref mismatch reject.                          |
| 2026-08-05 | **H1** | `done` — AI routes + navbot use `getTenantContext` (DB-verified schoolId).                                                                         |
| 2026-08-05 | **H2** | `done` — gateway queue/status filter by gateway schoolId (shared gateways keep gatewayId scope).                                                   |
| 2026-08-05 | **H3** | `done` — cron HTTP requires HMAC `x-zsms-cron-binding` + user∈school; session path verifies target user.                                           |
