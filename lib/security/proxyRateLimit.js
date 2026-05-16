/**
 * Lightweight rate limiting for the edge proxy (auth-sensitive paths).
 */

const buckets = new Map()
const MAX_BUCKETS = 5000

const SENSITIVE_ROUTES = [
  { prefix: '/api/auth/login', limit: 12, windowMs: 5 * 60 * 1000, keyPrefix: 'login' },
  { prefix: '/api/auth/forgot-password', limit: 5, windowMs: 15 * 60 * 1000, keyPrefix: 'forgot' },
  { prefix: '/api/schools/register', limit: 8, windowMs: 15 * 60 * 1000, keyPrefix: 'school_reg' },
  {
    prefix: '/api/schools/check-subdomain',
    limit: 30,
    windowMs: 5 * 60 * 1000,
    keyPrefix: 'subdomain',
  },
]

function getClientIp(request) {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function pruneBuckets() {
  if (buckets.size <= MAX_BUCKETS) return
  const now = Date.now()
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key)
    if (buckets.size <= MAX_BUCKETS * 0.8) break
  }
}

export function checkProxyRateLimit(request, pathname) {
  const route = SENSITIVE_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  )
  if (!route) return { limited: false }

  const ip = getClientIp(request)
  const key = `${route.keyPrefix}:${ip}`
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + route.windowMs })
    pruneBuckets()
    return { limited: false }
  }

  entry.count += 1
  if (entry.count > route.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    return { limited: true, retryAfter }
  }

  return { limited: false }
}
