/**
 * Telegram human-handoff alerts — metadata only.
 *
 * Deliberate pilot-stage choice: NEVER include chat message content in Telegram.
 * Admins read the full transcript in the platform support console.
 */

export type TelegramHandoffMeta = {
  tenantName: string
  role: string
  sessionId: string
  schoolId: string
  /** Deep link into the platform admin support console for this session */
  adminConsoleUrl: string
}

export type TelegramPayload = {
  text: string
  /** Structured metadata for tests / logging — never includes message content */
  meta: {
    tenantName: string
    role: string
    sessionId: string
    schoolId: string
    adminConsoleUrl: string
  }
}

/**
 * Build a metadata-only Telegram payload.
 * Keys are intentionally limited so unit tests can assert shape.
 */
export function buildTelegramHandoffPayload(input: TelegramHandoffMeta): TelegramPayload {
  const meta = {
    tenantName: String(input.tenantName || '').trim() || 'Unknown school',
    role: String(input.role || '').trim() || 'UNKNOWN',
    sessionId: String(input.sessionId || '').trim(),
    schoolId: String(input.schoolId || '').trim(),
    adminConsoleUrl: String(input.adminConsoleUrl || '').trim(),
  }

  const text = [
    'ZSMS chat handoff request',
    `School: ${meta.tenantName}`,
    `Role: ${meta.role}`,
    `Session: ${meta.sessionId}`,
    `Open: ${meta.adminConsoleUrl}`,
  ].join('\n')

  return { text, meta }
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    String(process.env.TELEGRAM_BOT_TOKEN || '').trim() &&
    String(process.env.TELEGRAM_CHAT_ID || '').trim()
  )
}

export function buildAdminConsoleSessionUrl(sessionId: string): string {
  const origin =
    String(process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '').trim() ||
    'http://localhost:3000'
  const base = origin.replace(/\/$/, '')
  return `${base}/platform/support?sessionId=${encodeURIComponent(sessionId)}`
}

/**
 * Send metadata-only Telegram alert. Returns false if not configured or send failed.
 * Callers must still complete PENDING_HUMAN even when this returns false.
 */
export async function sendTelegramHandoffAlert(
  input: TelegramHandoffMeta
): Promise<{ sent: boolean; reason?: string }> {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim()
  if (!token || !chatId) {
    console.warn(
      '[chat-handoff] Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — skipping alert. ' +
        'PENDING_HUMAN is still set; platform admins must claim at /platform/support.'
    )
    return { sent: false, reason: 'not_configured' }
  }

  const payload = buildTelegramHandoffPayload(input)

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.text,
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[chat-handoff] Telegram send failed', res.status, body.slice(0, 200))
      return { sent: false, reason: 'send_failed' }
    }
    return { sent: true }
  } catch (err) {
    console.warn('[chat-handoff] Telegram send error', err)
    return { sent: false, reason: 'send_error' }
  }
}
