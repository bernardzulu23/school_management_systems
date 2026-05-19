import { api } from './client'
import type { LoginResponse } from '@/types'
import { clearAuth, getRefreshToken, setSchoolContext, setTokens } from '@/storage/secure'

export interface LoginCredentials {
  email: string
  password: string
  subdomain: string
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const data = await api<LoginResponse>('/api/mobile/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    skipAuth: true,
    subdomain: credentials.subdomain,
  })
  await setTokens(data.accessToken, data.refreshToken)
  await setSchoolContext(data.school.subdomain, data.school.name, data.school.logoUrl ?? null)
  return data
}

export async function refreshSession(): Promise<{ accessToken: string }> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')
  const data = await api<{ accessToken: string; refreshToken?: string }>(
    '/api/mobile/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
    }
  )
  await setTokens(data.accessToken, data.refreshToken || refreshToken)
  return { accessToken: data.accessToken }
}

export async function logout(): Promise<void> {
  try {
    await api('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  }
  await clearAuth()
}
