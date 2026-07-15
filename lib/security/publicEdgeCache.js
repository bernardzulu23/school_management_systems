/** Public marketing routes safe to cache at the Vercel CDN edge (no user-specific HTML). */
export const PUBLIC_EDGE_CACHE_PATHS = [
  '/',
  '/pricing',
  '/features',
  '/about',
  '/privacy',
  '/terms',
]

export const PUBLIC_EDGE_CACHE_CONTROL =
  'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400, must-revalidate'

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isPublicEdgeCachePath(pathname) {
  const path =
    String(pathname || '/')
      .split('?')[0]
      .split('#')[0] || '/'
  if (path === '/') return true
  return PUBLIC_EDGE_CACHE_PATHS.filter((route) => route !== '/').some(
    (route) => path === route || path.startsWith(`${route}/`)
  )
}
