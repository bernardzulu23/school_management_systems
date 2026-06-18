/**
 * Headers expected by anti-scraping for in-app cookie session requests.
 * Use on fetch() calls that send credentials (axios sets these globally).
 */
export function withBrowserSessionFetchInit(init = {}) {
  const headers = new Headers(init.headers || {})
  if (!headers.has('accept')) {
    headers.set('accept', 'application/json')
  }
  if (!headers.has('x-requested-with')) {
    headers.set('x-requested-with', 'XMLHttpRequest')
  }
  return { ...init, headers }
}
