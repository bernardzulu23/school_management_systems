/**
 * PATCH /api/sms/gateway/[id] — update deviceName / isActive / school enable flag
 * DELETE /api/sms/gateway/[id] — revoke (hard-delete) a registered gateway device
 *
 * Platform-admin only. Tenant scoped: optional body (PATCH) or ?schoolId= (DELETE) must match the row.
 */
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { basePrisma } from '@/lib/prisma/client'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> | { id: string } }

async function resolveGatewayId(context: RouteContext): Promise<string> {
  const params = await Promise.resolve(context.params)
  const id = String(params?.id || '').trim()
  if (!id) throw new ApiError('Gateway id is required', 400)
  return id
}

async function requireAdmin(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return { ok: false as const, response: auth.response as Response }
  }
  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return {
      ok: false as const,
      response: secureJson({ error: gate.error }, { status: gate.status }, request),
    }
  }
  return { ok: true as const }
}

async function loadGatewayOrThrow(id: string, expectedSchoolId?: string | null) {
  const gateway = await basePrisma.sMSGateway.findUnique({
    where: { id },
    include: { school: { select: { id: true, name: true } } },
  })
  if (!gateway) throw new ApiError('Gateway not found', 404)
  if (expectedSchoolId && gateway.schoolId !== expectedSchoolId) {
    throw new ApiError('Gateway does not belong to the specified school', 403)
  }
  return gateway
}

export const PATCH = withErrorHandler(async function PATCH(
  request: Request,
  context: RouteContext
) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const id = await resolveGatewayId(context)
  const body = await request.json().catch(() => ({}))
  const expectedSchoolId = body?.schoolId != null ? String(body.schoolId).trim() : null

  const gateway = await loadGatewayOrThrow(id, expectedSchoolId || undefined)

  const data: { deviceName?: string; isActive?: boolean } = {}
  if (body?.deviceName !== undefined) {
    const deviceName = String(body.deviceName || '').trim()
    if (!deviceName) throw new ApiError('deviceName cannot be empty', 400)
    data.deviceName = deviceName
  }
  if (body?.isActive !== undefined) {
    data.isActive = Boolean(body.isActive)
  }

  if (Object.keys(data).length === 0 && body?.enableForSchool === undefined) {
    throw new ApiError('No updatable fields provided', 400)
  }

  const updated =
    Object.keys(data).length > 0
      ? await basePrisma.sMSGateway.update({
          where: { id: gateway.id },
          data,
        })
      : gateway

  let customGatewayEnabled: boolean | undefined
  if (body?.enableForSchool !== undefined) {
    const enableForSchool = Boolean(body.enableForSchool)
    const settings = await basePrisma.schoolSmsSettings.upsert({
      where: { schoolId: gateway.schoolId },
      create: { schoolId: gateway.schoolId, customGatewayEnabled: enableForSchool },
      update: { customGatewayEnabled: enableForSchool },
    })
    customGatewayEnabled = settings.customGatewayEnabled
  }

  return NextResponse.json({
    success: true,
    gateway: {
      id: updated.id,
      schoolId: updated.schoolId,
      schoolName: gateway.school.name,
      deviceName: updated.deviceName,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    },
    ...(customGatewayEnabled !== undefined ? { customGatewayEnabled } : {}),
  })
})

export const DELETE = withErrorHandler(async function DELETE(
  request: Request,
  context: RouteContext
) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const id = await resolveGatewayId(context)
  const url = new URL(request.url)
  // Tenant scoping via query only — avoid request.json() on DELETE (can hang with empty body).
  const schoolIdHint = url.searchParams.get('schoolId')?.trim() || null

  const gateway = await loadGatewayOrThrow(id, schoolIdHint || undefined)

  await basePrisma.sMSGateway.delete({ where: { id: gateway.id } })

  return NextResponse.json({
    success: true,
    deleted: true,
    id: gateway.id,
    schoolId: gateway.schoolId,
  })
})
