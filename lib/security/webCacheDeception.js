/**
 * Web Cache Deception (WCD) defenses — PortSwigger Web Security Academy vectors:
 * 1. Path mapping discrepancies (REST + static extension)
 * 2. Delimiter discrepancies (e.g. `;`)
 * 3. Delimiter decoding discrepancies (encoded `#`, `?`)
 * 4. Static directory normalization / path traversal
 * 5. File name cache rule discrepancies
 */

export const WCD_NO_STORE = 'no-store, no-cache, must-revalidate, private'

/** Extensions that CDNs/caches often treat as static (WCD path-mapping bait). */
export const WCD_STATIC_EXTENSIONS = [
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.exe',
  '.pdf',
  '.zip',
  '.xml',
  '.json',
  '.txt',
  '.html',
]

const STATIC_EXT_RE = new RegExp(
  `\\.(?:${WCD_STATIC_EXTENSIONS.map((e) => e.slice(1)).join('|')})$`,
  'i'
)

/**
 * Extract the raw (possibly still-encoded) pathname from a request URL string.
 * Do not use URL.pathname alone — it percent-decodes and can hide traversal.
 */
export function getRawPathname(requestOrUrl) {
  const raw =
    typeof requestOrUrl === 'string'
      ? requestOrUrl
      : String(requestOrUrl?.url || requestOrUrl?.nextUrl?.href || '')
  try {
    const withoutOrigin = raw.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '')
    const pathOnly = withoutOrigin.split(/[?#]/)[0]
    return pathOnly && pathOnly.length > 0 ? pathOnly : '/'
  } catch {
    return '/'
  }
}

/**
 * True when the raw path contains WCD / path-confusion markers.
 * Reject immediately — do not decode and continue.
 */
export function hasDangerousPath(rawPathname) {
  const p = String(rawPathname || '')
  if (!p) return false

  // Semicolon matrix / delimiter discrepancy
  if (p.includes(';')) return true

  // Encoded delimiters and control chars
  if (/%23|%3f|%00|%0a|%0d|%09/i.test(p)) return true

  // Encoded slashes (anywhere) — normalization discrepancy
  if (/%2f/i.test(p)) return true

  // Encoded / mixed dot-segments used in traversal
  if (/%2e/i.test(p)) return true

  // Literal traversal / mixed forms that survive partial decoding
  if (p.includes('%2e/') || p.includes('%2E/') || p.includes('/%2e') || p.includes('/%2E')) {
    return true
  }
  if (/(?:^|\/)\.\.(?:\/|$)/.test(p)) return true
  if (/(?:^|\/)\.(?:\/|$)/.test(p) && p !== '/.') return true

  // Decode once and compare — if decoding changes the path, reject
  try {
    let decoded = p
    try {
      decoded = decodeURIComponent(p)
    } catch {
      return true // malformed encoding
    }
    if (decoded !== p) {
      // Encoding was present; only allow if decode is "safe" and identical in structure.
      // Spec: any path that after URL decoding would change the resolved path → reject.
      return true
    }
  } catch {
    return true
  }

  return false
}

/**
 * Paths that are allowed to end with a static file extension.
 */
export function isAllowedStaticExtensionPath(pathname) {
  const p = String(pathname || '')
  if (p.startsWith('/_next/static/') || p.startsWith('/_next/')) return true
  if (p.startsWith('/icons/') || p.startsWith('/Assets/') || p.startsWith('/assets/')) return true
  if (p.startsWith('/api/security-static/')) return true
  if (
    p === '/favicon.svg' ||
    p === '/favicon.ico' ||
    p === '/robots.txt' ||
    p === '/manifest.json' ||
    p === '/sw.js' ||
    p === '/offline.html'
  ) {
    return true
  }
  return false
}

/**
 * Path mapping attack: dynamic route + static extension outside known asset dirs.
 */
export function shouldRejectStaticExtensionOnDynamicPath(pathname) {
  const p = String(pathname || '')
  if (!STATIC_EXT_RE.test(p)) return false
  if (isAllowedStaticExtensionPath(p)) return false
  return true
}

/**
 * Dynamic / authenticated route prefixes that must never be cached.
 * Excludes /api/health and /api/assets/** (and security-static asset proxy).
 */
export function shouldApplyWcdNoStore(pathname) {
  const p = String(pathname || '')
  if (p.startsWith('/dashboard') || p.startsWith('/platform') || p.startsWith('/onboarding')) {
    return true
  }
  if (!p.startsWith('/api')) return false
  if (p === '/api/health' || p.startsWith('/api/health/')) return false
  if (p.startsWith('/api/assets/') || p.startsWith('/api/security-static/')) return false
  return true
}

/**
 * Apply WCD no-store headers (defense-in-depth for CDN / browser caches).
 * @param {Response | { headers: Headers }} response
 */
export function applyWcdNoStoreHeaders(response) {
  if (!response?.headers?.set) return response
  response.headers.set('Cache-Control', WCD_NO_STORE)
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Surrogate-Control', 'no-store')
  return response
}

/**
 * Strip validators that enable conditional GET cache reuse.
 * @param {Response | { headers: Headers }} response
 */
export function stripCacheValidators(response) {
  if (!response?.headers?.delete) return response
  response.headers.delete('ETag')
  response.headers.delete('Last-Modified')
  return response
}
