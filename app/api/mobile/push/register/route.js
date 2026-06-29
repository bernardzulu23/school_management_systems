export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/
const STAFF_ROLES = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

// Register (or clear) the Expo push token for the authenticated user.
// POST { token: "ExponentPushToken[...]" }  -> stores token
// POST { token: null }                       -> clears token (logout)
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, STAFF_ROLES)) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const raw = body?.token
  const token = raw === null || raw === undefined ? null : String(raw).trim()

  if (token && !EXPO_TOKEN_RE.test(token)) {
    throw new ApiError('Invalid Expo push token', 400)
  }

  const updated = await prisma.user.updateMany({
    where: { id: userId, schoolId },
    data: {
      expoPushToken: token || null,
      expoPushTokenAt: token ? new Date() : null,
    },
  })
  if (updated.count === 0) throw new ApiError('User not found', 404)

  return NextResponse.json({ success: true })
})
