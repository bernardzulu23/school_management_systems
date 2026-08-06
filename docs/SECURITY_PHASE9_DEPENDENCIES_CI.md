# Phase 9 — Dependencies & CI

**Date:** 2026-08-05  
**Scope:** CVE audit report, PR gates (audit + tenant-scoping + Zod), Dependabot patch auto-merge

## Audit scorecard

| #   | Criterion                                              | Pre-fix                                  | Post-fix                                            |
| --- | ------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------- |
| 1   | Known CVE inventory (auth/Prisma/payments prioritized) | Ad hoc                                   | **PASS** — report below; CI fails on high+ prod     |
| 2   | PR workflow: audit + tenant check + Zod tests          | **PARTIAL** — `security.yml` (main only) | **PASS** — `pr-dependency-gates.yml` on every PR    |
| 3   | Dependabot + patch-only auto-merge                     | Dependabot weekly; no auto-merge         | **PASS** — Dependabot + `dependabot-auto-merge.yml` |

## `npm audit` snapshot (2026-08-05)

**Totals:** 10 issues — **0 critical**, **8 high**, **1 moderate**, **1 low**

### Auth / Prisma / payments priority

| Package                                                           | Path relevance               | Severity     | Notes                                                                                                |
| ----------------------------------------------------------------- | ---------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `@prisma/client` / `prisma` **6.19.3**                            | DB / tenancy                 | —            | **No advisory** in this audit                                                                        |
| `jose` **6.2.3** / `jsonwebtoken` **9.0.3**                       | Auth JWT                     | —            | **No advisory**                                                                                      |
| `zod` **3.25.76**                                                 | Request validation           | —            | **No advisory**                                                                                      |
| `next` **16.2.6** (range still flagged through 16.3.0-preview.10) | Proxy/middleware, App Router | **high**     | Middleware/proxy bypass, Server Action DoS/SSRF, cache confusion — **upgrade Next ASAP** (auth edge) |
| `axios` (via `africastalking`)                                    | SMS (not Lipila core)        | **high**     | DoS / prototype pollution in axios — bump axios / AT SDK                                             |
| `undici` (via `@vercel/blob`)                                     | HTTP client                  | **high**     | Response desync / cookie issues — `npm audit fix`                                                    |
| `postcss` / `sharp`                                               | Build / images (Next)        | **high**     | Traversal / libvips — follow Next/sharp upgrades                                                     |
| `africastalking`                                                  | SMS                          | **moderate** | Inherited from axios                                                                                 |
| `dompurify`                                                       | XSS sanitization             | **low**      | Custom element bypass — bump when convenient                                                         |
| `brace-expansion` / `js-yaml` / `fast-uri`                        | Transitive tooling           | **high**     | Mostly toolchains; `npm audit fix`                                                                   |

**Payment (Lipila) path:** no direct Lipila SDK CVE; risk is mainly **Next** (request handling) + secret hygiene (Phase 6), not a listed package CVE in this run.

**Recommended next actions**

1. Bump `next` past the advisory range (highest priority for auth proxy).
2. `npm audit fix` for undici/postcss/js-yaml/brace-expansion/dompurify where non-breaking.
3. Override or bump `axios` for Africa’s Talking until upstream releases.

CI gate: `npm run audit:security` (= `npm audit --audit-level=high --omit=dev`) — **currently fails** until highs are cleared.

## Workflows

| File                                                                                            | Role                                                           |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`.github/workflows/pr-dependency-gates.yml`](../.github/workflows/pr-dependency-gates.yml)     | Every PR: audit + `check:tenant` + `test:zod`                  |
| [`.github/workflows/dependabot-auto-merge.yml`](../.github/workflows/dependabot-auto-merge.yml) | Auto-merge Dependabot **semver-patch** only                    |
| [`.github/dependabot.yml`](../.github/dependabot.yml)                                           | Weekly updates; minors grouped; patches ungrouped for metadata |
| [`.github/workflows/security.yml`](../.github/workflows/security.yml)                           | Full Vitest + TruffleHog (also every PR)                       |

## Scripts

```bash
npm run audit:security   # fail on high+ (prod)
npm run audit:full       # full tree
npm run check:tenant     # Phase 1 static tenant scoping
npm run test:zod         # Zod / schema validation unit tests
```

## Branch protection note

Enable required status check **“Audit · tenant scope · Zod schemas”** (job from `pr-dependency-gates.yml`) so Dependabot patch auto-merge waits for green gates.
