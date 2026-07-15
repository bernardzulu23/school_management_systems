# School onboarding — full proof security scan

**Audience:** Bluepeak platform operators and release engineers  
**Purpose:** Prove the platform is secure and operationally ready **before** onboarding new schools or after a security-sensitive production deploy.  
**Related:** [PLATFORM_ADMIN.md](./PLATFORM_ADMIN.md) · [PENETRATION_TEST_PLAN.md](./PENETRATION_TEST_PLAN.md) · [SECURITY.md](./SECURITY.md) · [NEON_POST_DEPLOY_CHECKLIST.md](./NEON_POST_DEPLOY_CHECKLIST.md)

School staff do **not** run this checklist. It is an internal gate that complements the public `/onboarding` signup flow documented in [USER_GUIDE.md](./USER_GUIDE.md).

---

## When to run

| Trigger                                                                                        | Run                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| New school cohort / marketing launch                                                           | Full checklist (Phases 1–6)                                  |
| Production deploy touching `proxy.js`, `lib/security/*`, auth, onboarding, or tenant isolation | Phases 1–4 minimum                                           |
| ZAP or pen-test findings reported                                                              | Re-run affected phases + ZAP rescan                          |
| Monthly hygiene                                                                                | Phases 1–2 + spot-check Phase 3 on one live tenant subdomain |

---

## Phase 1 — Automated proof (local or CI)

These commands must pass on the release branch **before** schools are invited to onboard.

```bash
npm test                                    # includes __tests__/security/*
npm run audit:security                      # 0 HIGH/CRITICAL production deps
npm run audit:tenant                        # review scripts/tenant-audit-results.json
```

**CI mirror:** `.github/workflows/security.yml` runs `audit:security`, full Vitest, and TruffleHog secret scan on PRs and weekly.

| Test file                                     | What it proves                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `__tests__/security/csp.test.js`              | Nonce CSP (no `unsafe-inline` in prod script/style), static asset CSP, no wildcard CORS on API |
| `__tests__/security/tenant-isolation.test.js` | Cross-tenant access blocked                                                                    |
| `__tests__/security/input-validation.test.js` | Role escalation and payload limits                                                             |

**Pass criteria:** All tests green; `audit:security` exit 0; tenant audit has no unreviewed critical gaps.

---

## Phase 2 — Platform Health console

1. Sign in at the apex domain: `https://bluepeacktechnologies.com/login` (platform super-admin).
2. Open **Health** → `/platform/health`.
3. Confirm integration checks are **ok** (or **warn** only for optional services you accept for launch):

| Check                                  | Required for onboarding?                     |
| -------------------------------------- | -------------------------------------------- |
| Content-Security-Policy                | **Yes**                                      |
| Strict-Transport-Security (production) | **Yes**                                      |
| Lipila payments                        | **Yes** (if paid plans offered at signup)    |
| Groq / Gemini AI                       | Warn acceptable if AI not marketed at launch |
| Africa's Talking (USSD)                | Optional                                     |
| OR-Tools timetable solver              | Optional (greedy fallback exists)            |
| ECZ deadline cron                      | Recommended                                  |
| Postgres RLS on `Student`              | **Yes**                                      |
| JWT secrets configured                 | **Yes**                                      |

**Pass criteria:** No **fail** on CSP, HSTS, RLS, or JWT. Lipila **ok** if onboarding accepts mobile-money payment.

---

## Phase 3 — Live header proof (production tenant)

Run against a **live school subdomain** (e.g. `https://<school>.bluepeacktechnologies.com`) after deploy and CDN cache warm-up.

### 3.1 HTML pages (nonce CSP)

```powershell
# Login page — expect Content-Security-Policy with 'nonce-...'
(Invoke-WebRequest -Uri "https://<subdomain>.bluepeacktechnologies.com/login" -Method Head -UseBasicParsing).Headers
```

**Pass:** `Content-Security-Policy` present; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY` (or equivalent `frame-ancestors` in CSP).

### 3.2 Static assets (no wildcard CORS, asset CSP)

Static files under `/Assets/*` and `/icons/*` are served via `/api/security-static/*` with hardened headers (not raw CDN defaults).

```powershell
(Invoke-WebRequest -Uri "https://<subdomain>.bluepeacktechnologies.com/Assets/logo.jpg" -Method Head -UseBasicParsing).Headers
```

**Pass:**

- `Content-Security-Policy` present (restrictive: `default-src 'none'`, `img-src 'self' data: blob:`)
- **No** `Access-Control-Allow-Origin: *`
- First request after deploy may show `X-Vercel-Cache: MISS`; subsequent HIT is fine if headers match

### 3.3 API CORS

```powershell
# Evil origin must NOT receive ACAO
$headers = @{ Origin = "https://evil.example.com" }
(Invoke-WebRequest -Uri "https://<subdomain>.bluepeacktechnologies.com/api/health" -Method Head -Headers $headers -UseBasicParsing).Headers
```

**Pass:** No `Access-Control-Allow-Origin` for untrusted origins. Same-origin and `ALLOWED_ORIGINS` entries only.

### 3.4 Offline PWA page

Open `/offline.html` — must load **without** `cdn.tailwindcss.com` or other external scripts. Page uses self-contained CSS and a same-origin retry link.

### 3.5 Session cookies (logout)

After browser login → logout, inspect cleared cookies:

- `access_token`, `refresh_token`, `session-token`, `session` — **HttpOnly**, **Secure** (prod), **SameSite=Strict**
- `Domain` attribute only when `COOKIE_DOMAIN` is explicitly set (host-only by default)

**Pass criteria:** All Phase 3 checks pass on at least one production tenant subdomain.

---

## Phase 4 — OWASP ZAP full proof scan

Use **staging** for active scanning; use **production tenant subdomain** for passive baseline before onboarding cohorts.

1. Install [OWASP ZAP](https://www.zaproxy.org/download/).
2. Target: `https://<subdomain>.bluepeacktechnologies.com/` (or staging equivalent).
3. **Authenticate** as teacher (session cookie or Bearer replacer) for authenticated routes.
4. Run **Passive** scan first — fix all **High** alerts.
5. Run **Active** scan only on staging with written permission.
6. Re-scan after fixes until no open High/Medium alerts remain (or document accepted risks).

Documented scenarios: [PENETRATION_TEST_PLAN.md](./PENETRATION_TEST_PLAN.md) (auth bypass, tenant isolation, CSP, cookie flags).

**Pass criteria:** No unresolved **High** ZAP findings on the tenant URL used for school onboarding marketing.

---

## Phase 5 — Onboarding flow smoke test

Prove the **school signup path** end-to-end on staging or a disposable test subdomain.

| Step | Action                                                                                                | Expected                                                       |
| ---- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | Open apex `/onboarding`                                                                               | Form loads with CSP (no console CSP violations)                |
| 2    | Enter email + password → **Send Verification Link**                                                   | Resend email queued (or `DEV_ONBOARDING_SKIP_EMAIL` in dev)    |
| 3    | Open `/api/onboarding/verify/:token` link                                                             | Email verified; onboarding session cookie set                  |
| 4    | Optional: save **admin phone** (`PATCH /api/onboarding/contact`)                                      | Phone stored on registration                                   |
| 5    | Choose **Free trial** or complete Lipila payment                                                      | `paymentStatus: paid` or trial plan selected                   |
| 6    | **Create portal** — school name, subdomain, level, **ownership type**, province, district, admin name | `POST /api/onboarding/complete` → school + headteacher created |
| 7    | Check email                                                                                           | Portal login URL received                                      |
| 8    | If admin phone provided                                                                               | Welcome SMS sent (Africa's Talking / Mocean routing)           |
| 9    | Log in at `https://<subdomain>.bluepeacktechnologies.com/login`                                       | Headteacher dashboard loads; trial banner correct              |
| 10   | Platform admin **Overview**                                                                           | New school counted in onboarding trends                        |

**Ownership types** at complete: `PRIVATE`, `GOVERNMENT`, `COMMUNITY`, `GRANT_AIDED` — gates government/private feature sidebars.

**Legacy:** `/register-school` and `/api/schools/verify/:token` are deprecated; production marketing must link to `/onboarding` only.

**Pass criteria:** Steps 1–9 succeed without 5xx; portal is reachable and tenant-isolated.

---

## Phase 6 — Database and deploy health

Follow [NEON_POST_DEPLOY_CHECKLIST.md](./NEON_POST_DEPLOY_CHECKLIST.md):

- `DATABASE_URL` / `DIRECT_URL` point at the operational Neon branch (not empty default `production` branch)
- `GET /api/health` → `"database": { "status": "ok" }`
- Latest Prisma migration applied

---

## Sign-off record

Copy per release or onboarding cohort:

```
Release / cohort: _______________
Date: _______________
Operator: _______________

Phase 1 Automated:     [ ] Pass
Phase 2 Health:        [ ] Pass
Phase 3 Live headers:  [ ] Pass  (subdomain: _______________)
Phase 4 ZAP:           [ ] Pass  (report attached: _______________)
Phase 5 Onboarding:    [ ] Pass  (test subdomain: _______________)
Phase 6 Database:      [ ] Pass

Approved for school onboarding: [ ] Yes  [ ] No
Notes: _______________
```

---

## School-facing security (operator FAQ)

When schools ask about data protection during onboarding, you can state:

- Each school is a **separate tenant** at its own subdomain; academic data is not visible in the platform admin console (aggregate counts only).
- Sessions use **HttpOnly** cookies and **CSRF** protection on state-changing API calls.
- **Content-Security-Policy** and **HSTS** are enforced on all portal pages.
- **Facial attendance** (optional) requires headteacher opt-in and per-pupil **parent/guardian consent** before any face template is stored — see USER_GUIDE § Facial consent.
- Operators run this **full proof scan** before onboarding cohorts; schools do not need to run ZAP themselves.
