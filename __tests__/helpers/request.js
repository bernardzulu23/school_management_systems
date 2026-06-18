/**
 * Build a Request object for API route handler tests.
 * @param {object} options
 * @param {string} [options.method]
 * @param {string} [options.url]
 * @param {object} [options.body]
 * @param {Record<string, string>} [options.headers]
 * @param {Record<string, string>} [options.cookies]
 */
export function buildRequest({
  method = 'GET',
  url = 'http://localhost:3000/api/test',
  body,
  headers = {},
  cookies = {},
} = {}) {
  const hdrs = new Headers(headers)
  if (body !== undefined && !hdrs.has('content-type')) {
    hdrs.set('content-type', 'application/json')
  }
  if (!hdrs.has('user-agent')) {
    hdrs.set('user-agent', 'Mozilla/5.0 (compatible; ZSMS-Test/1.0)')
  }
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  if (cookieHeader) {
    hdrs.set('cookie', cookieHeader)
    if (!hdrs.has('x-requested-with')) {
      hdrs.set('x-requested-with', 'XMLHttpRequest')
    }
    if (!hdrs.has('accept')) {
      hdrs.set('accept', 'application/json')
    }
  }

  const init = {
    method,
    headers: hdrs,
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  const req = new Request(url, init)
  req.cookies = {
    get: (name) => {
      const value = cookies[name]
      return value !== undefined ? { value } : undefined
    },
  }
  return req
}

/**
 * @param {Response} response
 */
export async function parseJson(response) {
  return response.json()
}
