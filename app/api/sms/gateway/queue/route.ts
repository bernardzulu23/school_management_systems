/**
 * GET /api/sms/gateway/queue
 * Android poll: return PENDING CUSTOM_GATEWAY messages, mark DISPATCHED (idempotency).
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { basePrisma } from '@/lib/prisma/client'
import { requireActiveGateway } from '@/lib/sms/gatewayAuth'
import { tryReserveGatewayDispatch } from '@/lib/sms/gatewayRateLimit'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

const BATCH_LIMIT = 20

export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await requireActiveGateway(request)
  if (!auth.ok) {
    return secureJson({ error: auth.error }, { status: auth.status }, request)
  }
  const { gateway } = auth

  await basePrisma.sMSGateway.update({
    where: { id: gateway.id },
    data: {
      lastSeenAt: new Date(),
      lastHealthCheck: new Date(),
      // Clear so a future outage can alert again (one alert per episode).
      lastStaleAlertSentAt: null,
    },
  })

  const pending = await basePrisma.smsLog.findMany({
    where: {
      gatewayId: gateway.id,
      channel: 'CUSTOM_GATEWAY',
      status: 'PENDING',
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_LIMIT,
    select: {
      id: true,
      recipient: true,
      body: true,
      createdAt: true,
    },
  })

  if (pending.length === 0) {
    return NextResponse.json({ messages: [] })
  }

  const { allowed } = await tryReserveGatewayDispatch(gateway.id, pending.length)
  if (allowed <= 0) {
    // Rate limited — leave rows PENDING for the next poll.
    return NextResponse.json({ messages: [], rateLimited: true })
  }

  const batch = pending.slice(0, allowed)
  const ids = batch.map((m) => m.id)

  await basePrisma.smsLog.updateMany({
    where: { id: { in: ids }, status: 'PENDING' },
    data: { status: 'DISPATCHED' },
  })

  // Re-read only rows we successfully flipped (guards double-poll races).
  const dispatched = await basePrisma.smsLog.findMany({
    where: { id: { in: ids }, status: 'DISPATCHED' },
    select: { id: true, recipient: true, body: true, createdAt: true },
  })

  return NextResponse.json({
    messages: dispatched.map((m) => ({
      id: m.id,
      recipient: m.recipient,
      body: m.body,
      createdAt: m.createdAt,
    })),
  })
})
