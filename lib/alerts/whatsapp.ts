/**
 * Ops WhatsApp alerts via CallMeBot (https://www.callmebot.com).
 * Independent of Telegram — swap providers without touching the other channel.
 */

import type { AlertSendResult } from '@/lib/alerts/telegram'

export async function sendWhatsAppAlert(message: string): Promise<AlertSendResult> {
  const phone = String(process.env.CALLMEBOT_PHONE || '')
    .trim()
    .replace(/^\+/, '')
  const apikey = String(process.env.CALLMEBOT_APIKEY || '').trim()
  if (!phone || !apikey) {
    console.error('[WhatsApp Alert] Missing config — not sent:', message)
    return { success: false, reason: 'missing_config' }
  }

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`
    const response = await fetch(url)
    if (!response.ok) {
      console.error('[WhatsApp Alert] Non-OK response:', response.status)
      return { success: false, reason: `http_${response.status}` }
    }
    return { success: true }
  } catch (err) {
    console.error('[WhatsApp Alert] Send failed:', err)
    return { success: false, reason: 'network_error' }
  }
}
