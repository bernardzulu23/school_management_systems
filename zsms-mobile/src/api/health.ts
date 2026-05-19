import { getApiBaseUrl } from './client'

export async function checkAppVersion(): Promise<{ ok: boolean; version?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/health`, { method: 'GET' })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, version: data.version || data.status }
  } catch {
    return { ok: false }
  }
}
