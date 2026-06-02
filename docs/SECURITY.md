# ZSMS Security — Multi-Tenant Isolation

> Living document. Owner: platform engineering. Last reviewed: 2026-06-02 (red flag hardening).

This system is **multi-tenant**: every school (tenant) shares one database and one
deployment. The most severe class of bug here is **cross-tenant data leakage** —
one school reading or writing another school's records. This document records how
tenant isolation is enforced and how every API route is classified.

## The three attack vectors (OWASP Multi-Tenant Cheat Sheet)

1. **Cross-tenant data leakage** — School A reads School B's data.
2. **Tenant impersonation** — an attacker forges a `schoolId` in a request
   (body, query string, or header).
3. **Privilege escalation** — a user claims a role or school they do not own.

## Source of truth

The **only** trusted source of a caller's tenant is their verified session:

- The JWT (`access_token`, HttpOnly cookie or `Authorization: Bearer`), verified
  with HS256 in `lib/middleware/auth.ts`.
- Cross-checked against the live DB user record in
  `lib/tenant/resolveSchoolId.js` (`resolveAuthenticatedSchoolId`).

A `schoolId` taken from the request **body, query string, or a client-supplied
header is never trusted.** `resolveAuthenticatedSchoolId` actively rejects
mismatches:

| Condition                              | Response | Code                        |
| -------------------------------------- | -------- | --------------------------- |
| No authenticated user                  | 401      | `UNAUTHORIZED`              |
| User/school missing or school inactive | 403      | `TENANT_NOT_FOUND`          |
| JWT `schoolId` ≠ DB `schoolId`         | 403      | `TENANT_TOKEN_MISMATCH`     |
| `x-school-id` header ≠ DB `schoolId`   | 403      | `TENANT_HEADER_MISMATCH`    |
| Request subdomain ≠ DB `schoolId`      | 403      | `TENANT_SUBDOMAIN_MISMATCH` |

`authMiddleware` additionally rejects an `x-school-id` header that disagrees with
the JWT before any handler logic runs.

## Enforcement layers (defence in depth)

A tenant-scoped route must satisfy **at least one**, and in practice combines several:

1. **Row-Level Security (RLS)** — Postgres policies keyed on
   `app.current_school_id`, set via `withSchoolContext()` /
   `setSchoolContext()` (`lib/db/school-context.js`,
   migration `20260528120000_enable_rls`).
2. **Prisma tenant extension (new)** — `getTenantClient(schoolId)` in
   `lib/prisma/tenantClient.js` auto-injects `schoolId` on reads/writes.
   Use via `withTenantClient(request, fn)` in `lib/prisma/withTenant.js`.
   Platform/onboarding routes continue to use `basePrisma` from `lib/prisma/client.js`.
3. **Automated audit** — run `npm run audit:tenant` before releases; review
   `scripts/tenant-audit-results.json` for Prisma calls missing `schoolId`.
4. **Explicit query scoping** — every Prisma query filters on
   `where: { schoolId }`, where `schoolId` comes from
   `resolveAuthenticatedSchoolId`.
5. **Route-level tenant checks** — `verifyTenant()` / `getVerifiedSchoolId()` /
   `assertSameTenant()` (`lib/middleware/verify-tenant.js`) for routes with a
   `[schoolId]` param or object-level (IDOR) reads.

### `lib/middleware/verify-tenant.js`

| Helper                                   | Use                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `verifyTenant(user, requestedSchoolId)`  | Reject a requested school that isn't the user's own; returns `{ schoolId, error }`.   |
| `getVerifiedSchoolId(user, params)`      | Same, for routes with a `[schoolId]` URL segment.                                     |
| `assertSameTenant(user, recordSchoolId)` | After loading a record by id, confirm it belongs to the caller's tenant (IDOR guard). |
| `isPlatformSession(user)`                | The single controlled cross-tenant bypass.                                            |

## Controlled bypass: platform sessions

Platform/super-admin sessions are the **only** identities allowed to cross tenant
boundaries. They are identified by `isPlatform === true` **and** a `superadmin`
role (`isPlatformSession`). Neither flag alone grants the bypass — a forged
`role: 'superadmin'` without `isPlatform`, or vice versa, is denied. Platform
routes live under `/api/platform/*` and authenticate via `lib/middleware/platformAuth`.

## Route audit (224 API routes, 2026-05-29)

Audit method: static scan of `app/api/**/route.js` for the enforcement helpers,
verified against the route source.

| Class                                           | Count     | Isolation mechanism                                                                 |
| ----------------------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| Tenant-scoped app routes                        | 143       | `resolveAuthenticatedSchoolId` + Prisma `where: { schoolId }` (+ RLS where enabled) |
| Platform/super-admin routes (`/api/platform/*`) | 13        | `platformAuth` (controlled cross-tenant)                                            |
| Public-by-design / unauthenticated              | remainder | See exemption list below                                                            |

### Public-by-design exemptions (no tenant scope by intent)

These routes legitimately do not scope to a tenant; each is protected by another
mechanism:

| Route(s)                                                                                                             | Why exempt                               | Protection                                                 |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password*` | Pre-session auth flows                   | Rate limiting, credential checks, short-lived tokens       |
| `/api/mobile/auth/login`, `/api/platform/auth/login`                                                                 | Pre-session auth                         | As above                                                   |
| `/api/schools/register`, `/api/onboarding/*`                                                                         | Tenant created/derived during onboarding | Signed onboarding tokens / payment callbacks               |
| `/api/public/schools`, `/api/school/current`                                                                         | Public lookup of tenant by subdomain     | Returns only non-sensitive public fields                   |
| `/api/payments/lipila/callback`, `/api/onboarding/lipila/callback`, `/api/sms/inbound`, `/api/sms/delivery`          | Provider webhooks                        | Signature/provider verification, no caller session         |
| `/api/health`, `/api/ping`, `/api/csrf-token`                                                                        | Infra/liveness/CSRF                      | No tenant data returned                                    |
| `/api/cron/*`                                                                                                        | Scheduled jobs                           | Cron secret; operate across tenants by design              |
| `/api/ussd`                                                                                                          | USSD gateway                             | Gateway-authenticated; tenant resolved from session/MSISDN |

## Tests (must pass before every production deploy)

- `__tests__/security/tenant-isolation.test.js` — cross-tenant denial, forged
  `schoolId` rejection, `x-school-id` spoof rejection, token/DB mismatch, and the
  controlled platform bypass (20 cases).
- `__tests__/security/auth-bypass.test.js` — CVE-2025-29927 + header spoof.
- `__tests__/security/input-validation.test.js` — privilege-escalation field stripping.
- `__tests__/security/csp.test.js` — security headers.

CI runs these on every PR/push via `.github/workflows/security.yml`.

## When adding a new route — checklist

- [ ] Authenticate with `authMiddleware`; enforce role with `roleCheck`.
- [ ] Resolve the tenant with `resolveAuthenticatedSchoolId` — never read
      `schoolId` from the body/query.
- [ ] Scope every Prisma query with `where: { schoolId }` (and/or RLS).
- [ ] For `[id]`/`[schoolId]` routes, call `assertSameTenant` / `getVerifiedSchoolId`
      after loading the record.
- [ ] Validate the body with a Zod schema (`lib/schemas/`).
- [ ] If the route is intentionally public, add it to the exemption table above
      with its protecting mechanism.
