/**
 * Block open redirects from API/user-controlled URLs.
 * Allows root-relative paths and same-origin / tenant subdomain HTTPS URLs.
 */

const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript):/i

function normalizeBaseDomain(value) {
  return String(value || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()
}

function getClientBaseDomain() {
  const fromEnv = normalizeBaseDomain(
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN || process.env.NEXT_PUBLIC_BASE_DOMAIN
  )
  if (fromEnv) return fromEnv

  const origin = String(
    process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || ''
  ).trim()
  if (origin) {
    try {
      return normalizeBaseDomain(new URL(origin).hostname)
    } catch {
      /* ignore */
    }
  }
  return 'bluepeacktechnologies.com'
}

function resolveBaseDomain(options = {}) {
  const explicit = normalizeBaseDomain(options.baseDomain)
  if (explicit) return explicit
  if (typeof window !== 'undefined') return getClientBaseDomain()
  return normalizeBaseDomain(process.env.APP_BASE_DOMAIN || process.env.BASE_DOMAIN)
}

function isHostnameAllowed(hostname, { currentHostname, baseDomain }) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
  if (!host) return false
  if (host === currentHostname) return true
  if (host === 'localhost' || host === '127.0.0.1') return true
  if (!baseDomain) return false
  if (host === baseDomain) return true
  if (host.endsWith(`.${baseDomain}`)) return true
  return false
}

/**
 * @param {unknown} url
 * @param {{ fallback?: string, baseDomain?: string, allowExternalTenant?: boolean }} [options]
 * @returns {string}
 */
export function sanitizeRedirectUrl(url, options = {}) {
  const { fallback = '/dashboard', allowExternalTenant = true } = options
  const baseDomain = resolveBaseDomain(options)

  if (typeof url !== 'string') return fallback
  const trimmed = url.trim()
  if (!trimmed || DANGEROUS_PROTOCOL.test(trimmed)) return fallback

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }

  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback

    if (
      allowExternalTenant &&
      isHostnameAllowed(parsed.hostname, { currentHostname, baseDomain })
    ) {
      return parsed.href
    }

    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash
    }

    return fallback
  } catch {
    return fallback
  }
}

/**
 * @param {unknown} url
 * @param {{ fallback?: string, baseDomain?: string, allowExternalTenant?: boolean }} [options]
 * @returns {string}
 */
export function redirectToSafeUrl(url, options = {}) {
  const safe = sanitizeRedirectUrl(url, options)
  if (typeof window !== 'undefined') {
    window.location.href = safe
  }
  return safe
}
