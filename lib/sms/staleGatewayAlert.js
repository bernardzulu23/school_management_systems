/**
 * Stale SMS gateway health check + Telegram alert (one per outage episode).
 * Reuses TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID from chat handoff.
 */
import { basePrisma } from '@/lib/prisma/client'

/** Minutes without a successful poll before a gateway is considered stale. */
export const GATEWAY_STALE_THRESHOLD_MINUTES = 15

async function sendTelegramAdminMessage(text) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim()
  if (!token || !chatId) {
    console.warn(
      '[sms-gateway-health] Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — skipping alert'
    )
    return { sent: false, reason: 'not_configured' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[sms-gateway-health] Telegram send failed', res.status, body.slice(0, 200))
      return { sent: false, reason: 'send_failed' }
    }
    return { sent: true }
  } catch (err) {
    console.warn('[sms-gateway-health] Telegram send error', err)
    return { sent: false, reason: 'send_error' }
  }
}

function minutesAgoLabel(lastSeenAt, nowMs) {
  if (!lastSeenAt) return 'never'
  const mins = Math.max(0, Math.round((nowMs - lastSeenAt.getTime()) / 60000))
  return `${mins} minute${mins === 1 ? '' : 's'} ago`
}

/**
 * @returns {Promise<{ checked: number, stale: number, alerted: number, skippedAlreadyAlerted: number }>}
 */
export async function runStaleGatewayHealthCron() {
  const now = Date.now()
  const thresholdMs = GATEWAY_STALE_THRESHOLD_MINUTES * 60 * 1000
  const cutoff = new Date(now - thresholdMs)

  const gateways = await basePrisma.sMSGateway.findMany({
    where: { isActive: true },
    select: {
      id: true,
      deviceName: true,
      lastSeenAt: true,
      lastStaleAlertSentAt: true,
      school: { select: { id: true, name: true } },
    },
  })

  let stale = 0
  let alerted = 0
  let skippedAlreadyAlerted = 0

  for (const g of gateways) {
    const isStale = !g.lastSeenAt || g.lastSeenAt < cutoff
    if (!isStale) continue
    stale += 1

    if (g.lastStaleAlertSentAt) {
      skippedAlreadyAlerted += 1
      continue
    }

    const schoolName = g.school?.name || g.school?.id || 'Unknown school'
    const lastSeenStr = g.lastSeenAt ? g.lastSeenAt.toISOString() : 'never'
    const ago = minutesAgoLabel(g.lastSeenAt, now)

    const text = [
      '🚨 SMS Gateway Offline',
      `School: ${schoolName}`,
      `Device: ${g.deviceName || g.id}`,
      `Last seen: ${lastSeenStr} (${ago})`,
      'No fallback is active — SMS is not sending for this school.',
    ].join('\n')

    const result = await sendTelegramAdminMessage(text)
    if (result.sent) {
      await basePrisma.sMSGateway.update({
        where: { id: g.id },
        data: { lastStaleAlertSentAt: new Date() },
      })
      alerted += 1
    } else {
      console.error('[sms-gateway-health] Failed to alert for stale gateway', {
        gatewayId: g.id,
        schoolId: g.school?.id,
        reason: result.reason,
      })
    }
  }

  return {
    checked: gateways.length,
    stale,
    alerted,
    skippedAlreadyAlerted,
  }
}
