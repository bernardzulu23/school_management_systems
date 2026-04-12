import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

export function requireRole(request, allowedRoles) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth

  if (!roleCheck(auth.user, allowedRoles)) {
    return {
      isAuthenticated: true,
      user: auth.user,
      response: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
      denied: true,
    }
  }

  return auth
}
