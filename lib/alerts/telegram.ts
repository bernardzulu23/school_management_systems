/**
 * Ops Telegram alerts (Bot API).
 * Independent of WhatsApp — swap providers without touching the other channel.
 */

export type AlertSendResult =
  | { success: true }
  | { success: false; reason: 'missing_config' | `http_${number}` | 'network_error' | string }

export async function sendTelegramAlert(message: string): Promise<AlertSendResult> {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim()
  if (!token || !chatId) {
    console.error('[Telegram Alert] Missing config — not sent:', message)
    return { success: false, reason: 'missing_config' }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    })
    if (!response.ok) {
      console.error('[Telegram Alert] Non-OK response:', response.status)
      return { success: false, reason: `http_${response.status}` }
    }
    return { success: true }
  } catch (err) {
    console.error('[Telegram Alert] Send failed:', err)
    return { success: false, reason: 'network_error' }
  }
}
