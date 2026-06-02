# Cloudflare rate limiting (production)

Configure in **Cloudflare Dashboard → Security → WAF → Rate limiting rules** for `bluepeacktechnologies.com` and `*.bluepeacktechnologies.com`.

The app also enforces limits in `proxy.js` (`lib/security/proxyRateLimit.js`) and route handlers — Cloudflare is the first line of defence.

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

## Rule 3 — Password reset abuse

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| **Name**     | ZSMS Forgot password                                                     |
| **Match**    | URI Path equals `/api/auth/forgot-password` **and** Method equals `POST` |
| **Rate**     | 3 requests per 3600 seconds                                              |
| **Count by** | IP                                                                       |
| **Action**   | Block (429)                                                              |

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
