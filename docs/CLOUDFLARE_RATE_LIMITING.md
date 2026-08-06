# Cloudflare rate limiting (production)

Configure in **Cloudflare Dashboard → Security → WAF → Rate limiting rules** for the apex
domain, `*.your-saas-domain`, and any **Cloudflare for SaaS** custom hostnames that terminate
on this Vercel project.

The app also enforces limits in `proxy.js` (`lib/security/proxyRateLimit.js`) and route handlers —
Cloudflare is the first line of defence (shared across all Vercel instances).

## Rule 1 — Public attendance page

| Field        | Value                          |
| ------------ | ------------------------------ |
| **Name**     | ZSMS Attend page flood         |
| **Match**    | URI Path equals `/attend`      |
| **Rate**     | 30 requests per 60 seconds     |
| **Count by** | IP                             |
| **Action**   | Block                          |
| **Response** | 429, body: `Too many requests` |

## Rule 2 — Login brute force

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| **Name**     | ZSMS Login protection                                          |
| **Match**    | URI Path equals `/api/auth/login` **and** Method equals `POST` |
| **Rate**     | 10 requests per 15 minutes                                     |
| **Count by** | IP                                                             |
| **Action**   | Block (429)                                                    |

App-side: `rateLimiter` on login (5/15min per IP+email in production) + proxy limit 10/15min.

## Rule 3 — Forgot password

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| **Name**     | ZSMS Forgot password                                                     |
| **Match**    | URI Path equals `/api/auth/forgot-password` **and** Method equals `POST` |
| **Rate**     | 3 requests per 3600 seconds                                              |
| **Count by** | IP                                                                       |
| **Action**   | Block (429)                                                              |

## Rule 4 — Reset password

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| **Name**     | ZSMS Reset password                                                      |
| **Match**    | URI Path starts with `/api/auth/reset-password` **and** Method is `POST` |
| **Rate**     | 10 requests per 3600 seconds                                             |
| **Count by** | IP                                                                       |
| **Action**   | Block (429)                                                              |

## Rule 5 — Platform admin login

| Field        | Value                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| **Name**     | ZSMS Platform login                                                     |
| **Match**    | URI Path equals `/api/platform/auth/login` **and** Method equals `POST` |
| **Rate**     | 8 requests per 5 minutes                                                |
| **Count by** | IP                                                                      |
| **Action**   | Block (429)                                                             |

## Rule 6 — SMS gateway info (dashboard polling)

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| **Name**     | ZSMS SMS gateway info                                        |
| **Match**    | URI Path equals `/api/sms/gateway/info` **and** Method `GET` |
| **Rate**     | 60 requests per 60 seconds                                   |
| **Count by** | IP                                                           |
| **Action**   | Block (429)                                                  |

Note: `/api/sms/*` is exempt from app anti-scrape RL; proxy + this CF rule cover abuse.

## Rule 7 — Public contact form

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| **Name**     | ZSMS Public contact                                                |
| **Match**    | URI Path equals `/api/public/contact` **and** Method equals `POST` |
| **Rate**     | 10 requests per 15 minutes                                         |
| **Count by** | IP                                                                 |
| **Action**   | Block (429)                                                        |

## Cloudflare for SaaS / custom school domains

1. Custom hostnames must proxy to the **same** Vercel deployment as the apex (same `proxy.js`).
2. Enable HTTPS + HTTP→HTTPS redirect on every custom hostname.
3. HSTS (`max-age=63072000; includeSubDomains; preload`) is set by the app in production for
   all responses that pass through `applySecurityHeaders` — including `/platform/*`,
   `/api/sms/gateway/*`, and tenant subdomains.
4. CSP is **nonce-based** per request in `proxy.js` (not a static next.config CSP for HTML).
5. Apply the rate-limit rules above to **all hostnames** in the zone (or duplicate for SaaS fallback origin).

## Verification (curl)

Replace `YOUR_DOMAIN` with production host.

```bash
# Login — expect 429 after repeated failures (Cloudflare + app)
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://YOUR_DOMAIN/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Attend page
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" "https://YOUR_DOMAIN/attend"
done
```
