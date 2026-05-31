/**
 * Central security headers, CSP, and CORS for Next.js (proxy + next.config).
 */

const IS_PROD = process.env.NODE_ENV === 'production'

function parseList(envValue) {
  return String(envValue || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function getAppOrigins() {
  const origins = new Set()
  const add = (url) => {
    if (!url) return
    try {
      const u = new URL(url)
      origins.add(u.origin)
    } catch {
      /* ignore invalid */
    }
  }

  add(process.env.NEXT_PUBLIC_APP_ORIGIN)
  add(process.env.NEXT_PUBLIC_APP_URL)
  add(process.env.NEXTAUTH_URL)
  add(process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)

  for (const item of parseList(process.env.ALLOWED_ORIGINS)) {
    add(item.startsWith('http') ? item : `https://${item}`)
  }

  if (!IS_PROD) {
    for (const host of ['localhost', '127.0.0.1']) {
      for (const port of ['3000', '3001', '3002', '4000']) {
        origins.add(`http://${host}:${port}`)
      }
    }
  }

  return origins
}

/** Browser same-origin POSTs send Origin matching the request Host. */
export function isSameOriginAsHost(request) {
  const originHeader = request.headers.get('origin')
  const hostHeader = request.headers.get('host')
  if (!originHeader || !hostHeader) return false
  try {
    const originUrl = new URL(originHeader)
    const expected = `${originUrl.protocol}//${hostHeader}`.toLowerCase()
    return originHeader.toLowerCase() === expected
  } catch {
    return false
  }
}

const ALLOWED_ORIGIN_SUFFIXES = parseList(
  process.env.ALLOWED_ORIGIN_SUFFIXES || '.bluepeacktechnologies.com,.vercel.app'
)

export function isProduction() {
  return IS_PROD
}

export function buildContentSecurityPolicy() {
  const connectSrc = [
    "'self'",
    'https://*.bluepeacktechnologies.com',
    'https://*.vercel.app',
    'https://challenges.cloudflare.com',
    'https://static.cloudflareinsights.com',
    'https://emkc.org',
    // Monaco editor loads its worker/asset chunks from jsDelivr.
    'https://cdn.jsdelivr.net',
    // Vercel Blob public store (direct large-file RAG uploads).
    'https://*.public.blob.vercel-storage.com',
  ]

  if (!IS_PROD) {
    connectSrc.push(
      'http://localhost:*',
      'http://127.0.0.1:*',
      'ws://localhost:*',
      'ws://127.0.0.1:*'
    )
  }

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // Monaco code playground (bundled editor + worker bootstrap).
    "'unsafe-eval'",
    'https://static.cloudflareinsights.com',
    'https://challenges.cloudflare.com',
    'https://cdn.jsdelivr.net',
  ]

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.bluepeacktechnologies.com https://*.public.blob.vercel-storage.com",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  if (IS_PROD) {
    directives.push('upgrade-insecure-requests', 'block-all-mixed-content')
  }

  return directives.join('; ')
}

/**
 * @returns {Record<string, string>}
 */
export function getSecurityHeaders(options = {}) {
  const { includeHsts = IS_PROD } = options

  const headers = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'off',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Origin-Agent-Cluster': '?1',
    'X-Download-Options': 'noopen',
    'Permissions-Policy':
      'accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), interest-cohort=()',
    'Content-Security-Policy': buildContentSecurityPolicy(),
  }

  if (includeHsts) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  return headers
}

export function resolveCorsOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) return ''

  const allowed = getAppOrigins()
  if (allowed.has(origin)) return origin

  try {
    const host = new URL(origin).hostname.toLowerCase()
    if (
      ALLOWED_ORIGIN_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))
    ) {
      return origin
    }
  } catch {
    return ''
  }

  return ''
}

export function getCorsHeaders(request) {
  const allowOrigin = resolveCorsOrigin(request)
  if (!allowOrigin) return {}

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, X-School-Subdomain, x-school-subdomain',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/**
 * Apply security + optional CORS headers to a NextResponse or Headers instance.
 */
export function applySecurityHeaders(response, request, options = {}) {
  const security = getSecurityHeaders(options)
  const cors = options.cors !== false && request ? getCorsHeaders(request) : {}

  for (const [key, value] of Object.entries({ ...security, ...cors })) {
    response.headers.set(key, value)
  }

  response.headers.delete('X-Powered-By')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  return response
}

export function nextConfigSecurityHeaders() {
  return Object.entries(getSecurityHeaders({ includeHsts: IS_PROD })).map(([key, value]) => ({
    key,
    value,
  }))
}

/** Reject cross-site POSTs when Origin is present but not allowlisted. */
function isSameRegistrableDomain(originHost, requestHost) {
  const suffixes = ALLOWED_ORIGIN_SUFFIXES.length
    ? ALLOWED_ORIGIN_SUFFIXES
    : ['.bluepeacktechnologies.com']
  const o = String(originHost || '').toLowerCase()
  const h = String(requestHost || '').toLowerCase()
  if (!o || !h) return false
  return suffixes.some((suffix) => {
    const s = suffix.startsWith('.') ? suffix : `.${suffix}`
    return (o === s.slice(1) || o.endsWith(s)) && (h === s.slice(1) || h.endsWith(s))
  })
}

export function isForbiddenCrossOrigin(request) {
  const method = String(request.method || 'GET').toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return false

  const origin = request.headers.get('origin')
  if (!origin) return false
  if (isSameOriginAsHost(request)) return false

  try {
    const originHost = new URL(origin).hostname
    const requestHost = String(request.headers.get('host') || '').split(':')[0]
    if (isSameRegistrableDomain(originHost, requestHost)) return false
  } catch {
    /* ignore */
  }

  return !resolveCorsOrigin(request)
}

export const BLOCKED_HTTP_METHODS = new Set(['TRACE', 'TRACK', 'CONNECT'])

/**
 * Internal headers that must NEVER originate from an external client.
 *
 * Next.js uses several of these internally for routing/middleware. If an
 * external request carries them, it is an attack attempt — most notably
 * CVE-2025-29927 (CVSS 9.1), where `x-middleware-subrequest` lets a caller
 * skip middleware entirely. We are on Next 16 (already patched), but we strip
 * these at the proxy as defence-in-depth.
 *
 * The `x-school-*` / `x-platform-*` entries are ZSMS-internal tenant signals.
 * The proxy sets `x-school-subdomain` itself from the verified hostname, so any
 * client-supplied value is spoofing and must be removed before forwarding.
 *
 * Reference: https://vercel.com/blog/postmortem-on-next-js-middleware-bypass
 */
export const INTERNAL_HEADERS_TO_STRIP = [
  'x-middleware-subrequest',
  'x-middleware-invoke',
  'x-invoke-path',
  'x-invoke-query',
  'x-invoke-output',
  'x-next-intl-locale',
  'x-school-subdomain',
  'x-school-subdomain-override',
  'x-platform-admin-override',
]

/**
 * Remove internal/spoofable headers from a Headers instance in place.
 *
 * @param {Headers} headers - typically `new Headers(request.headers)`
 * @returns {Headers} the same instance, mutated
 */
export function stripInternalRequestHeaders(headers) {
  if (!headers || typeof headers.delete !== 'function') return headers
  for (const name of INTERNAL_HEADERS_TO_STRIP) {
    headers.delete(name)
  }
  return headers
}
