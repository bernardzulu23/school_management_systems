import { api } from './client'

export async function registerPushToken(token: string): Promise<void> {
  await api('/api/mobile/push/register', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function clearPushToken(): Promise<void> {
  await api('/api/mobile/push/register', {
    method: 'POST',
    body: JSON.stringify({ token: null }),
  }).catch(() => {})
}
