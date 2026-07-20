/**
 * POST /api/sms/gateway/status
 * Android reports per-message SENT / FAILED after SmsManager callback.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { basePrisma } from '@/lib/prisma/client'
import { requireActiveGateway } from '@/lib/sms/gatewayAuth'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

export const POST = withErrorHandler(async function POST(request: Request) {
  const auth = await requireActiveGateway(request)
  if (!auth.ok) {
    return secureJson({ error: auth.error }, { status: auth.status }, request)
  }
  const { gateway } = auth

  const body = await request.json().catch(() => ({}))
  const messageId = String(body?.messageId || '').trim()
  const status = String(body?.status || '')
    .trim()
    .toUpperCase()
  const failureReason =
    body?.failureReason != null ? String(body.failureReason).slice(0, 500) : null

  if (!messageId) throw new ApiError('messageId is required', 400)
  if (status !== 'SENT' && status !== 'FAILED') {
    throw new ApiError("status must be 'SENT' or 'FAILED'", 400)
  }

  const log = await basePrisma.smsLog.findFirst({
    where: {
      id: messageId,
      gatewayId: gateway.id,
      channel: 'CUSTOM_GATEWAY',
    },
  })
  if (!log) throw new ApiError('Message not found for this gateway', 404)

  // Idempotent: already terminal.
  if (log.status === 'SENT' || log.status === 'FAILED') {
    return NextResponse.json({ success: true, status: log.status, alreadyFinal: true })
  }

  await basePrisma.smsLog.update({
    where: { id: log.id },
    data: {
      status,
      failureReason: status === 'FAILED' ? failureReason : null,
    },
  })

  await basePrisma.sMSGateway.update({
    where: { id: gateway.id },
    data:
      status === 'SENT'
        ? { totalSent: { increment: 1 }, lastSeenAt: new Date() }
        : { totalFailed: { increment: 1 }, lastSeenAt: new Date() },
  })

  return NextResponse.json({ success: true, status })
})
