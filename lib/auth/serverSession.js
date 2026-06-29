import { cookies } from 'next/headers'
import { authMiddleware } from '@/lib/middleware/auth'

/**
 * Resolve the authenticated user on the server from the HTTP-only access_token cookie.
 * Returns null when unauthenticated or the session is invalid.
 */
export async function getServerAuthUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null

  const request = new Request('https://zsms.internal/server-session', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) return null
  return auth.user
}
