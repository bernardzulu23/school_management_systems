import {
  getAccessToken,
  getRefreshToken,
  getSubdomain,
  setTokens,
  clearAuth,
} from '@/storage/secure'
import { userFacingFromHttp, ERROR_MESSAGES } from '@/lib/security/userFacingErrors'

/**
 * Apex (bluepeacktechnologies.com) 308-redirects to www. React Native fetch then
 * drops Authorization on the cross-host follow → instant 401 / logout after login.
 */
function resolveApiBase(): string {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  try {
    const u = new URL(raw)
    if (u.hostname === 'bluepeacktechnologies.com') {
      u.hostname = 'www.bluepeacktechnologies.com'
      return u.origin
    }
  } catch {
    // keep raw
  }
  return raw
}

const BASE = resolveApiBase()

let refreshPromise: Promise<string | null> | null = null

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Android SecureStore can lag a tick after setTokens — retry briefly. */
async function readAccessToken(): Promise<string | null> {
  let token = await getAccessToken()
  if (token) return token
  await sleep(80)
  token = await getAccessToken()
  if (token) return token
  await sleep(150)
  return getAccessToken()
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${BASE}/api/mobile/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'mobile',
        },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return null
      const access = data.accessToken as string
      const refresh = data.refreshToken as string | undefined
      if (access) {
        await setTokens(access, refresh || refreshToken)
        return access
      }
      return null
    } catch {
      return null
    }
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

export class ApiError extends Error {
  status: number
  details?: unknown
  code?: string
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
    const d = details as { code?: string } | undefined
    this.code = d?.code
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { subdomain?: string; skipAuth?: boolean; retry?: boolean } = {}
): Promise<T> {
  const token = options.skipAuth ? null : await readAccessToken()
  const subdomain = options.subdomain ?? (await getSubdomain())
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (subdomain) headers['x-school-subdomain'] = subdomain

  // Reject client-side WCD bait paths (server also enforces).
  if (/[;]|%2e|%2f|%23|%3f|%00/i.test(path)) {
    throw new ApiError('Bad Request', 400, { code: 'INVALID_PATH' })
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0)
  }

  // Redirect responses without auto-follow auth are treated as misconfigured base URL.
  if (res.status >= 300 && res.status < 400) {
    throw new ApiError(
      'API host redirected. Update EXPO_PUBLIC_API_BASE_URL to the www site URL.',
      res.status,
      { code: 'API_BASE_REDIRECT' }
    )
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401 && !options.skipAuth && !options.retry) {
    // Token may not have been readable yet — retry once with a fresh SecureStore read.
    if (!token) {
      const lateToken = await readAccessToken()
      if (lateToken) {
        return api<T>(path, { ...options, retry: true })
      }
      throw new ApiError(ERROR_MESSAGES.SESSION_EXPIRED, 401, data)
    }

    const newToken = await refreshAccessToken()
    if (newToken) {
      return api<T>(path, { ...options, retry: true })
    }
    // Do not clear tokens here — Auth/session stores decide when to force logout.
    // Clearing mid-request races with a successful login and kicks users out instantly.
    throw new ApiError(ERROR_MESSAGES.SESSION_EXPIRED, 401, data)
  }

  if (!res.ok) {
    const safe = userFacingFromHttp(
      res.status,
      data,
      res.status === 401 ? ERROR_MESSAGES.AUTH_FAILED : ERROR_MESSAGES.GENERIC
    )
    if (res.status === 401 && options.skipAuth) {
      throw new ApiError(ERROR_MESSAGES.AUTH_FAILED, 401, data)
    }
    throw new ApiError(safe, res.status, data)
  }

  return data as T
}

export function getApiBaseUrl(): string {
  return BASE
}
