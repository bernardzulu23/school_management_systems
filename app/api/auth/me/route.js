import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  return NextResponse.json({
    success: true,
    user: auth.user,
  })
}
