import prisma from '@/lib/prisma'
import { pushSmsLog } from '@/lib/sms'

export async function createSmsLog({
  schoolId,
  direction = 'out',
  recipient,
  fromNumber = null,
  body,
  status = 'SENT',
  provider = 'africastalking',
  providerRef = null,
  broadcastId = null,
  idempotencyKey = null,
}) {
  const entry = {
    direction,
    schoolId: schoolId || null,
    to: recipient,
    from: fromNumber,
    message: body,
    text: body,
    status,
    provider,
    providerRef,
    broadcastId,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  }

  pushSmsLog(entry)

  if (!schoolId) return entry

  try {
    await prisma.smsLog.create({
      data: {
        schoolId,
        direction,
        recipient: recipient || null,
        fromNumber,
        body: body || null,
        status,
        provider,
        providerRef,
        broadcastId,
        idempotencyKey,
      },
    })
  } catch (e) {
    if (e?.code === 'P2002' && idempotencyKey) {
      return entry
    }
    console.error('[SMS_LOG_PERSIST]', e?.message || e)
  }

  return entry
}

export async function listSmsLogsForSchool(schoolId, { limit = 300 } = {}) {
  const take = Math.min(500, Math.max(1, Number(limit) || 300))
  const rows = await prisma.smsLog.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take,
  })

  return rows.map((r) => ({
    id: r.id,
    direction: r.direction,
    to: r.recipient,
    from: r.fromNumber,
    message: r.body,
    text: r.body,
    status: r.status,
    provider: r.provider,
    providerRef: r.providerRef,
    broadcastId: r.broadcastId,
    createdAt: r.createdAt.toISOString(),
  }))
}
