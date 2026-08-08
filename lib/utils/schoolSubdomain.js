/**
 * Shared school-tenant subdomain helpers (client + server).
 * Apex and www.<base> are the marketing/platform host — never a school slug.
 */

export const PLATFORM_RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'smtp',
  'dashboard',
  'login',
  'register',
  'register-school',
  'billing',
  'support',
  'help',
  'demo',
  'test',
  'staging',
  'bluepeack',
  'bluepeacktechnologies',
  'superadmin',
  'root',
  'system',
  'null',
  'undefined',
  'ftp',
  'ssh',
  'vpn',
  'dev',
  'zsms',
  'zms',
  'onboarding',
  'join',
  'platform',
])

export function getAppBaseDomain() {
  return String(
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ||
      process.env.NEXT_PUBLIC_BASE_DOMAIN ||
      process.env.APP_BASE_DOMAIN ||
      process.env.BASE_DOMAIN ||
      'bluepeacktechnologies.com'
  )
    .toLowerCase()
    .trim()
}

export function isPlatformReservedSubdomain(slug) {
  const clean = String(slug || '')
    .trim()
    .toLowerCase()
  return Boolean(clean) && PLATFORM_RESERVED_SUBDOMAINS.has(clean)
}

/**
 * Normalize an explicit school slug (?subdomain=). Reserved platform tokens → null.
 */
export function normalizeSchoolSubdomain(input) {
  const clean = String(input || '')
    .trim()
    .toLowerCase()
  if (!clean || isPlatformReservedSubdomain(clean)) return null
  return clean
}

function stripPort(host) {
  return String(host || '')
    .split(':')[0]
    .toLowerCase()
    .trim()
}

/**
 * Resolve tenant school slug from a hostname.
 * Returns null for localhost, apex, www.<base>, reserved labels, and non-tenant hosts.
 */
export function getSchoolSubdomainFromHost(host) {
  const hostname = stripPort(host)
  if (!hostname) return null
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.0.0.1') ||
    hostname.startsWith('0.0.0.0') ||
    hostname.endsWith('.vercel.app')
  ) {
    return null
  }

  const base = getAppBaseDomain()
  if (hostname === base || hostname === `www.${base}`) return null

  if (base && hostname.endsWith(`.${base}`)) {
    const sub = hostname.slice(0, -(base.length + 1)).split('.')[0]
    return normalizeSchoolSubdomain(sub)
  }

  // Unknown / custom host: do not treat the first label as a school slug
  // (avoids www.example.com → "www"). Custom domains resolve elsewhere.
  const parts = hostname.split('.').filter(Boolean)
  if (parts.length >= 3 && parts[0] === 'www' && parts.length >= 4) {
    return normalizeSchoolSubdomain(parts[1])
  }

  return null
}
