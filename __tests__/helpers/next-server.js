/**
 * Minimal next/server shim for Vitest API route tests.
 * The repo's installed `next` package may not export App Router APIs; routes still import `next/server`.
 */

class ResponseCookies {
  constructor() {
    /** @type {Map<string, string>} */
    this._map = new Map()
  }

  set(name, value) {
    this._map.set(name, value)
  }

  get(name) {
    const value = this._map.get(name)
    return value !== undefined ? { name, value } : undefined
  }

  getAll() {
    return [...this._map.entries()].map(([name, value]) => ({ name, value }))
  }
}

export class NextResponse extends Response {
  constructor(body, init = {}) {
    super(body, init)
    this.cookies = new ResponseCookies()
  }

  static json(body, init = {}) {
    const status = init.status ?? 200
    const headers = new Headers(init.headers)
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    return new NextResponse(JSON.stringify(body), { ...init, status, headers })
  }

  static redirect(url, init = {}) {
    const status = typeof init === 'number' ? init : (init?.status ?? 307)
    return new NextResponse(null, {
      status,
      headers: { Location: String(url) },
    })
  }
}

export class NextRequest extends Request {
  constructor(input, init = {}) {
    super(input, init)
    const cookieHeader = this.headers.get('cookie') || ''
    const jar = Object.fromEntries(
      cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const idx = part.indexOf('=')
          if (idx === -1) return [part, '']
          return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))]
        })
    )
    this.cookies = {
      get: (name) => {
        const value = jar[name]
        return value !== undefined ? { name, value } : undefined
      },
    }
  }
}
