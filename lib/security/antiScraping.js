/**
 * Anti-scraping controls for /api routes (enforced in proxy.js).
 *
 * Production is on by default. Set ANTI_SCRAPING_ENABLED=false to disable.
 * In development, enable with ANTI_SCRAPING_ENABLED=true for testing.
 */

import { isProduction } from '@/lib/security/headers'

/** Paths that must never be blocked (webhooks, mobile, health). */
export const SCRAPER_EXEMPT_PREFIXES = [
  '/api/health',
  '/api/ping',
  '/api/csrf-token',
  '/api/sms/',
  '/api/payments/lipila/callback',
  '/api/onboarding/lipila/callback',
  '/api/mobile/',
]

/** Cookie session bootstrap — must work with plain fetch() after login. */
export const SESSION_AUTH_PATHS = ['/api/auth/me', '/api/auth/refresh', '/api/auth/logout']

export function isSessionAuthPath(pathname) {
  return SESSION_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

const BLOCKED_UA_SUBSTRINGS = [
  'scrapy',
  'httpclient',
  'libwww-perl',
  'wget/',
  'curl/',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'apache-httpclient',
  'okhttp/',
  'java/',
  'node-fetch',
  'undici',
  'got/',
  'postmanruntime',
  'insomnia',
  'headlesschrome',
  'phantomjs',
  'selenium',
  'puppeteer',
  'playwright',
  'bytespider',
  'petalbot',
  'semrushbot',
  'ahrefsbot',
  'dotbot',
  'mj12bot',
  'gptbot',
  'claudebot',
  'anthropic-ai',
  'ccbot',
  'dataforseo',
  'serpstatbot',
]

const buckets = new Map()
const MAX_BUCKETS = 12_000

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function getLimits() {
  return {
    publicGet: {
      limit: parsePositiveInt(process.env.SCRAPE_RATE_PUBLIC_GET, 60),
      windowMs: 60 * 1000,
    },
    publicMutation: {
      limit: parsePositiveInt(process.env.SCRAPE_RATE_PUBLIC_MUTATION, 25),
      windowMs: 60 * 1000,
    },
    authGet: {
      limit: parsePositiveInt(process.env.SCRAPE_RATE_AUTH_GET, 400),
      windowMs: 5 * 60 * 1000,
    },
    authMutation: {
      limit: parsePositiveInt(process.env.SCRAPE_RATE_AUTH_MUTATION, 150),
      windowMs: 5 * 60 * 1000,
    },
  }
}

export function isAntiScrapingEnabled() {
  if (process.env.ANTI_SCRAPING_ENABLED === 'false') return false
  if (process.env.ANTI_SCRAPING_ENABLED === 'true') return true
  return isProduction()
}

export function isScraperExemptPath(pathname) {
  return SCRAPER_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}`)
  )
}

export function getClientIp(request) {
  const cf = String(request.headers.get('cf-connecting-ip') || '').trim()
  if (cf) return cf
  const xff = String(request.headers.get('x-forwarded-for') || '').trim()
  if (xff) return xff.split(',')[0].trim()
  const xrip = String(request.headers.get('x-real-ip') || '').trim()
  if (xrip) return xrip
  return 'unknown'
}

export function hasAuthToken(request) {
  return (
    Boolean(request.cookies?.get?.('access_token')?.value) ||
    Boolean(request.cookies?.get?.('refresh_token')?.value) ||
    Boolean(request.cookies?.get?.('session-token')?.value) ||
    Boolean(request.cookies?.get?.('session')?.value) ||
    String(request.headers.get('authorization') || '')
      .trim()
      .toLowerCase()
      .startsWith('bearer ')
  )
}

function hasBearerAuth(request) {
  return String(request.headers.get('authorization') || '')
    .trim()
    .toLowerCase()
    .startsWith('bearer ')
}

function hasBrowserClientHeaders(request) {
  const xhr = String(request.headers.get('x-requested-with') || '').toLowerCase()
  const accept = String(request.headers.get('accept') || '').toLowerCase()
  return xhr === 'xmlhttprequest' && (accept.includes('application/json') || accept.includes('*/*'))
}

function isBlockedUserAgent(userAgent) {
  const ua = String(userAgent || '').trim()
  if (!ua) return true
  const lower = ua.toLowerCase()
  return BLOCKED_UA_SUBSTRINGS.some((part) => lower.includes(part))
}

function isCrossSiteApiRequest(request) {
  const secFetchSite = String(request.headers.get('sec-fetch-site') || '').toLowerCase()
  if (!secFetchSite) return false
  return secFetchSite === 'cross-site' || secFetchSite === 'cross-origin'
}

function pruneBuckets() {
  if (buckets.size <= MAX_BUCKETS) return
  const now = Date.now()
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key)
    if (buckets.size <= MAX_BUCKETS * 0.8) break
  }
}

function consumeBucket(key, cfg) {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + cfg.windowMs })
    pruneBuckets()
    return { limited: false }
  }

  entry.count += 1
  if (entry.count > cfg.limit) {
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  return { limited: false }
}

/**
 * Block scripted clients and non-browser API access patterns.
 * @param {import('next/server').NextRequest} request
 * @param {string} pathname
 * @param {{ isPublic?: boolean }} [options]
 */
export function checkAntiScraping(request, pathname, options = {}) {
  if (!isAntiScrapingEnabled()) return { blocked: false }
  if (!pathname.startsWith('/api')) return { blocked: false }
  if (isScraperExemptPath(pathname)) return { blocked: false }

  const method = String(request.method || 'GET').toUpperCase()
  if (method === 'OPTIONS') return { blocked: false }

  const isPublic = Boolean(options.isPublic)
  const authenticated = hasAuthToken(request)
  const bearer = hasBearerAuth(request)
  const userAgent = request.headers.get('user-agent') || ''

  if (isBlockedUserAgent(userAgent)) {
    return { blocked: true, status: 403, code: 'blocked_client' }
  }

  // Cookie-session API calls must originate from the in-app XHR client (not curl/scripts).
  // Session bootstrap routes use plain fetch() and are exempt from the XHR header check.
  if (authenticated && !bearer && !isSessionAuthPath(pathname)) {
    if (!hasBrowserClientHeaders(request)) {
      return { blocked: true, status: 403, code: 'invalid_client' }
    }
    if (isCrossSiteApiRequest(request)) {
      return { blocked: true, status: 403, code: 'cross_site' }
    }
  }

  return { blocked: false }
}

/**
 * Broad API rate limits to slow bulk scraping (per IP + route group).
 * @param {import('next/server').NextRequest} request
 * @param {string} pathname
 * @param {{ isPublic?: boolean }} [options]
 */
export function checkApiScrapeRateLimit(request, pathname, options = {}) {
  if (!isAntiScrapingEnabled()) return { limited: false }
  if (!pathname.startsWith('/api')) return { limited: false }
  if (isScraperExemptPath(pathname)) return { limited: false }

  const method = String(request.method || 'GET').toUpperCase()
  if (method === 'OPTIONS') return { limited: false }

  const isPublic = Boolean(options.isPublic)
  const authenticated = hasAuthToken(request)
  const limits = getLimits()

  let tier
  if (isPublic && !authenticated) {
    tier = method === 'GET' || method === 'HEAD' ? 'publicGet' : 'publicMutation'
  } else {
    tier = method === 'GET' || method === 'HEAD' ? 'authGet' : 'authMutation'
  }

  const cfg = limits[tier]
  const ip = getClientIp(request)
  const routeGroup = pathname.split('/').slice(0, 4).join('/') || pathname
  const key = `scrape:${tier}:${ip}:${routeGroup}`

  return consumeBucket(key, cfg)
}

/**
 * Clamp list `limit` query params to reduce bulk extraction.
 * @param {URLSearchParams | { get: (k: string) => string | null }} searchParams
 * @param {{ defaultLimit?: number, maxLimit?: number }} [options]
 */
export function clampListLimit(searchParams, options = {}) {
  const defaultLimit = options.defaultLimit ?? 20
  const maxLimit = options.maxLimit ?? 100
  const raw = Number.parseInt(String(searchParams?.get?.('limit') ?? ''), 10)
  if (!Number.isFinite(raw) || raw <= 0) return defaultLimit
  return Math.min(raw, maxLimit)
}
