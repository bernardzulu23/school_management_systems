/**
 * POST /api/sms/gateway/register
 * Platform-admin only: create shared or dedicated gateway; return raw pairing token once.
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

async function setCustomGatewayEnabledForSchools(schoolIds: string[], enabled: boolean) {
  for (const schoolId of schoolIds) {
    await basePrisma.schoolSmsSettings.upsert({
      where: { schoolId },
      create: { schoolId, customGatewayEnabled: enabled },
      update: { customGatewayEnabled: enabled },
    })
  }
}

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
  const deviceName = String(body?.deviceName || '').trim() || 'Primary SMS Gateway'
  const enableForAllSchools = Boolean(body?.enableForAllSchools ?? body?.enableForSchool)
  const bindSchoolId = String(body?.schoolId || '').trim() || null
  // Dedicated = one school only (cannot be polled/hijacked for another school's queue).
  const dedicated = Boolean(body?.dedicated) || (Boolean(bindSchoolId) && body?.isShared === false)

  if (dedicated && !bindSchoolId) {
    throw new ApiError('schoolId is required for dedicated gateways', 400)
  }

  if (bindSchoolId) {
    const school = await basePrisma.school.findUnique({
      where: { id: bindSchoolId },
      select: { id: true, name: true },
    })
    if (!school) throw new ApiError('School not found', 404)
  }

  const rawToken = randomBytes(32).toString('hex')
  const deviceTokenHash = hashDeviceToken(rawToken)
  let apiTokenEncrypted: string
  try {
    apiTokenEncrypted = encrypt(rawToken)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Encryption failed'
    throw new ApiError(
      msg.includes('SMS_GATEWAY_ENCRYPTION_KEY')
        ? 'SMS gateway encryption is not configured. Set SMS_GATEWAY_ENCRYPTION_KEY (64-char hex) on the server.'
        : msg,
      500
    )
  }

  const isShared = !dedicated

  if (isShared) {
    // New shared gateway becomes the sole active shared device — deactivate prior shared ones.
    await basePrisma.sMSGateway.updateMany({
      where: { isShared: true, isActive: true },
      data: { isActive: false },
    })
  }

  const gateway = await basePrisma.sMSGateway.create({
    data: {
      schoolId: dedicated ? bindSchoolId : null,
      deviceName,
      deviceToken: deviceTokenHash,
      apiTokenEncrypted,
      isShared,
      isActive: true,
    },
  })

  let enabledSchoolCount = 0
  if (dedicated && bindSchoolId) {
    await setCustomGatewayEnabledForSchools([bindSchoolId], true)
    enabledSchoolCount = 1
  } else if (enableForAllSchools) {
    const schools = await basePrisma.school.findMany({ select: { id: true } })
    const ids = schools.map((s) => s.id)
    await setCustomGatewayEnabledForSchools(ids, true)
    enabledSchoolCount = ids.length
  } else if (bindSchoolId) {
    await setCustomGatewayEnabledForSchools([bindSchoolId], true)
    enabledSchoolCount = 1
  }

  const schoolName =
    dedicated && bindSchoolId
      ? (
          await basePrisma.school.findUnique({
            where: { id: bindSchoolId },
            select: { name: true },
          })
        )?.name || null
      : null

  return NextResponse.json({
    success: true,
    gateway: {
      id: gateway.id,
      schoolId: gateway.schoolId,
      schoolName,
      deviceName: gateway.deviceName,
      isShared: gateway.isShared,
      isActive: gateway.isActive,
      createdAt: gateway.createdAt,
    },
    enabledSchoolCount,
    customGatewayEnabled: dedicated || enableForAllSchools || Boolean(bindSchoolId),
    // Pairing secret — display once. School admins cannot register or re-bind tokens.
    deviceToken: rawToken,
  })
})
