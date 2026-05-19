import { getAccessToken, getRefreshToken, getSubdomain, setTokens } from '@/storage/secure'

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) return null
    const res = await fetch(`${BASE}/api/mobile/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { subdomain?: string; skipAuth?: boolean; retry?: boolean } = {}
): Promise<T> {
  const token = options.skipAuth ? null : await getAccessToken()
  const subdomain = options.subdomain ?? (await getSubdomain())
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (subdomain) headers['x-school-subdomain'] = subdomain

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (res.status === 401 && !options.skipAuth && !options.retry) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return api<T>(path, { ...options, retry: true })
    }
    throw new ApiError(data.error || 'Session expired', 401, data)
  }

  if (!res.ok) {
    throw new ApiError(data.error || res.statusText || 'Request failed', res.status, data)
  }

  return data as T
}

export function getApiBaseUrl(): string {
  return BASE
}
