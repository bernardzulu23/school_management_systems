export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/

// Register (or clear) the Expo push token for the authenticated user.
// POST { token: "ExponentPushToken[...]" }  -> stores token
// POST { token: null }                       -> clears token (logout)
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const raw = body?.token
  const token = raw === null || raw === undefined ? null : String(raw).trim()

  if (token && !EXPO_TOKEN_RE.test(token)) {
    throw new ApiError('Invalid Expo push token', 400)
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      expoPushToken: token || null,
      expoPushTokenAt: token ? new Date() : null,
    },
  })

  return NextResponse.json({ success: true })
})
