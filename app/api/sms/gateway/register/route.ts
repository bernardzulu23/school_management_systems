/**
 * POST /api/sms/gateway/register
 * Platform-admin only: create a gateway device and return the raw pairing token once.
 */
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { basePrisma } from '@/lib/prisma/client'
import { encrypt, hashDeviceToken } from '@/lib/sms/encryption'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

export const POST = withErrorHandler(async function POST(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return auth.response as Response
  }
  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return secureJson({ error: gate.error }, { status: gate.status }, request)
  }

  const body = await request.json().catch(() => ({}))
  const schoolId = String(body?.schoolId || '').trim()
  const deviceName = String(body?.deviceName || '').trim() || 'SMS Gateway phone'
  const enableForSchool = Boolean(body?.enableForSchool)

  if (!schoolId) throw new ApiError('schoolId is required', 400)

  const school = await basePrisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true },
  })
  if (!school) throw new ApiError('School not found', 404)

  // Raw token shown once to pair the Android app — never stored plaintext.
  const rawToken = randomBytes(32).toString('hex')
  const deviceTokenHash = hashDeviceToken(rawToken)
  const apiTokenEncrypted = encrypt(rawToken)

  const gateway = await basePrisma.sMSGateway.create({
    data: {
      schoolId,
      deviceName,
      deviceToken: deviceTokenHash,
      apiTokenEncrypted,
      isActive: true,
    },
  })

  if (enableForSchool) {
    await basePrisma.schoolSmsSettings.upsert({
      where: { schoolId },
      create: { schoolId, customGatewayEnabled: true },
      update: { customGatewayEnabled: true },
    })
  }

  return NextResponse.json({
    success: true,
    gateway: {
      id: gateway.id,
      schoolId: gateway.schoolId,
      schoolName: school.name,
      deviceName: gateway.deviceName,
      isActive: gateway.isActive,
      createdAt: gateway.createdAt,
    },
    customGatewayEnabled: enableForSchool,
    // Pairing secret — display as QR / manual entry. Not retrievable as plaintext later
    // without decrypting apiTokenEncrypted (admin-only helper can be added if needed).
    deviceToken: rawToken,
  })
})
