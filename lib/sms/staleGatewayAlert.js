/**
 * Stale SMS gateway health check + dual-channel ops alerts (Telegram + WhatsApp).
 * Trigger: 15-minute lastSeenAt staleness; one alert episode via lastStaleAlertSentAt.
 * Delivery fans out independently — one channel failing must not block the other.
 */
import { basePrisma } from '@/lib/prisma/client'
import { sendTelegramAlert } from '@/lib/alerts/telegram'
import { sendWhatsAppAlert } from '@/lib/alerts/whatsapp'

/** Minutes without a successful poll before a gateway is considered stale. */
export const GATEWAY_STALE_THRESHOLD_MINUTES = 15

function minutesAgoLabel(lastSeenAt, nowMs) {
  if (!lastSeenAt) return 'never'
  const mins = Math.max(0, Math.round((nowMs - lastSeenAt.getTime()) / 60000))
  return `${mins} minute${mins === 1 ? '' : 's'} ago`
}

function settledResult(label, settled) {
  if (settled.status === 'fulfilled') return settled.value
  console.error(`[Gateway Alert] ${label} threw:`, settled.reason)
  return { success: false, reason: 'rejected' }
}

/**
 * Fan out one alert message to Telegram + WhatsApp independently.
 * @returns {Promise<{ anySuccess: boolean, telegram: object, whatsapp: object }>}
 */
export async function sendGatewayOpsAlerts(alertMessage) {
  const [telegramSettled, whatsappSettled] = await Promise.allSettled([
    sendTelegramAlert(alertMessage),
    sendWhatsAppAlert(alertMessage),
  ])

  const telegram = settledResult('Telegram', telegramSettled)
  const whatsapp = settledResult('WhatsApp', whatsappSettled)

  console.log('[Gateway Alert] Telegram:', telegram)
  console.log('[Gateway Alert] WhatsApp:', whatsapp)

  return {
    anySuccess: Boolean(telegram?.success || whatsapp?.success),
    telegram,
    whatsapp,
  }
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

    const alertMessage = [
      '🚨 SMS Gateway Offline',
      `School: ${schoolName}`,
      `Device: ${g.deviceName || g.id}`,
      `Last seen: ${lastSeenStr} (${ago})`,
      'No fallback is active — SMS is not sending for this school.',
    ].join('\n')

    const delivery = await sendGatewayOpsAlerts(alertMessage)

    // Mark episode alerted if at least one channel delivered — avoids double-spam
    // while still retrying next cron tick if both channels fail.
    if (delivery.anySuccess) {
      await basePrisma.sMSGateway.update({
        where: { id: g.id },
        data: { lastStaleAlertSentAt: new Date() },
      })
      alerted += 1
    } else {
      console.error('[sms-gateway-health] Failed to alert for stale gateway on both channels', {
        gatewayId: g.id,
        schoolId: g.school?.id,
        telegram: delivery.telegram,
        whatsapp: delivery.whatsapp,
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
