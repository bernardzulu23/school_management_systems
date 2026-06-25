/**
 * Central security headers, CSP, and CORS for Next.js (proxy + next.config).
 */

import { isPublicEdgeCachePath, PUBLIC_EDGE_CACHE_CONTROL } from './publicEdgeCache.js'

const IS_PROD = process.env.NODE_ENV === 'production'

/** Generate a per-request CSP nonce (Edge + Node safe). */
export function generateNonce() {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(id).toString('base64')
  }
  return btoa(id)
}

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

const CLOUDFLARE_SCRIPT_SRC = [
  'https://static.cloudflareinsights.com',
  'https://challenges.cloudflare.com',
  'https://cdn.jsdelivr.net',
]

const CLOUDFLARE_CONNECT_SRC = [
  'https://challenges.cloudflare.com',
  'https://static.cloudflareinsights.com',
]

/**
 * Build CSP.
 * - API / JSON: optional nonce + strict-dynamic (no inline document scripts).
 * - HTML documents: self + Cloudflare + jsDelivr (no strict-dynamic — Next prerender lacks script nonces).
 * @param {{ nonce?: string, allowEval?: boolean, reportUri?: string, production?: boolean }} [options]
 */
export function buildContentSecurityPolicy(options = {}) {
  const { nonce, allowEval = false, reportUri, production = IS_PROD } = options

  const connectSrc = [
    "'self'",
    'https://*.bluepeacktechnologies.com',
    'https://*.vercel.app',
    ...CLOUDFLARE_CONNECT_SRC,
    'https://emkc.org',
    'https://cdn.jsdelivr.net',
    'https://*.public.blob.vercel-storage.com',
    'https://vercel.com',
  ]

  if (!production) {
    connectSrc.push(
      'http://localhost:*',
      'http://127.0.0.1:*',
      'ws://localhost:*',
      'ws://127.0.0.1:*'
    )
  }

  const scriptSrc = ["'self'"]

  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`, "'strict-dynamic'")
  } else {
    // Cloudflare Turnstile / managed-challenge bootstraps use short inline scripts.
    scriptSrc.push("'unsafe-inline'")
  }

  scriptSrc.push(...CLOUDFLARE_SCRIPT_SRC)

  // Monaco code playground requires dynamic eval; scoped to that route only in prod.
  if (allowEval) {
    scriptSrc.push("'unsafe-eval'", "'wasm-unsafe-eval'")
  } else if (!production) {
    // React Refresh / webpack HMR in development.
    scriptSrc.push("'unsafe-eval'")
  } else {
    scriptSrc.push("'wasm-unsafe-eval'")
  }

  const scriptSrcValue = scriptSrc.join(' ')

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrcValue}`,
    // Explicit script-src-elem avoids browsers falling back ambiguously (Cloudflare console warnings).
    `script-src-elem ${scriptSrcValue}`,
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

  if (production) {
    directives.push('upgrade-insecure-requests', 'block-all-mixed-content')
  }

  if (reportUri) {
    directives.push(`report-uri ${reportUri}`)
  }

  return directives.join('; ')
}

/**
 * @param {{ nonce?: string, allowEval?: boolean, includeHsts?: boolean, crossOriginIsolation?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function getSecurityHeaders(options = {}) {
  const {
    nonce,
    allowEval = false,
    includeHsts = IS_PROD,
    crossOriginIsolation = IS_PROD,
  } = options

  const reportUri = !IS_PROD && process.env.CSP_REPORT_URI ? process.env.CSP_REPORT_URI : undefined

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
      'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=()',
    'Content-Security-Policy': buildContentSecurityPolicy({
      nonce,
      allowEval,
      reportUri,
    }),
  }

  if (crossOriginIsolation) {
    // credentialless: cross-origin isolation without breaking most CDNs (Turnstile, fonts).
    headers['Cross-Origin-Embedder-Policy'] = 'credentialless'
  }

  if (includeHsts) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  return headers
}

/** Static hardening headers for next.config (CSP is set per-request in proxy.js with a nonce). */
export function getStaticSecurityHeaders(options = {}) {
  const headers = getSecurityHeaders(options)
  delete headers['Content-Security-Policy']
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
      'Content-Type, Authorization, X-Requested-With, X-School-Subdomain, x-school-subdomain, X-CSRF-Token, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/**
 * Apply security + optional CORS headers to a NextResponse or Headers instance.
 * @param {import('next/server').NextResponse} response
 * @param {import('next/server').NextRequest | null} request
 * @param {{ cors?: boolean, nonce?: string, pathname?: string, allowEval?: boolean }} [options]
 */
export function applySecurityHeaders(response, request, options = {}) {
  const pathname =
    options.pathname || (request?.nextUrl?.pathname ? String(request.nextUrl.pathname) : '')

  const nonce =
    options.nonce === false
      ? undefined
      : options.nonce || request?.headers?.get?.('x-nonce') || generateNonce()

  const allowEval = options.allowEval === true || pathname.includes('/code-playground')

  const security = getSecurityHeaders({
    nonce,
    allowEval,
    includeHsts: IS_PROD,
  })
  const cors = options.cors !== false && request ? getCorsHeaders(request) : {}

  for (const [key, value] of Object.entries({ ...security, ...cors })) {
    response.headers.set(key, value)
  }

  response.headers.delete('X-Powered-By')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Document HTML uses self-only script-src (see proxy.js). Only edge-cache marketing routes.
  const isDocument =
    pathname &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next/static') &&
    !pathname.startsWith('/_next/image')

  if (isDocument && request?.method === 'GET') {
    if (isPublicEdgeCachePath(pathname)) {
      response.headers.set('Cache-Control', PUBLIC_EDGE_CACHE_CONTROL)
    } else {
      // Nonced HTML for authenticated/dynamic routes — do not cache at the edge.
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
    }
  }

  if (pathname.startsWith('/api')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }

  return response
}

export function nextConfigSecurityHeaders() {
  return Object.entries(getStaticSecurityHeaders({ includeHsts: IS_PROD })).map(([key, value]) => ({
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
