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
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  if (cookieHeader) hdrs.set('cookie', cookieHeader)

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
