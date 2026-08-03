export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { buildOfflineSeedPayload } from '@/lib/offline/build-seed-payload'
import { encryptSeedPayload } from '@/lib/offline/seed-crypto'

/**
 * POST /api/offline/seed
 * Body: { passphrase: string (min 6), role?: string }
 * Returns encrypted .zsmsseed JSON (role-scoped, assigned-only).
 */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const passphrase = String(body.passphrase || '').trim()
  if (passphrase.length < 6) {
    throw new ApiError('Passphrase must be at least 6 characters', 400)
  }

  const roleHint = String(body.role || auth.user.role || '').toUpperCase() || undefined
  const payload = await buildOfflineSeedPayload({
    schoolId,
    user: auth.user,
    roleHint,
  })

  // Never put secrets in seed
  delete payload.data?.tokens
  delete payload.data?.cookies

  const envelope = await encryptSeedPayload(payload, passphrase)
  const fileName = `zsms-offline-${payload.role.toLowerCase()}-${new Date()
    .toISOString()
    .slice(0, 10)}.zsmsseed`

  return NextResponse.json({
    success: true,
    fileName,
    expiresAt: payload.expiresAt,
    role: payload.role,
    seed: envelope,
  })
})
