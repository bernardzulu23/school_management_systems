/**
 * Expo Push API delivery for mobile devices.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export function isExpoPushToken(token) {
  const t = String(token || '').trim()
  return t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
}

/**
 * @param {{
 *   token: string
 *   title: string
 *   message: string
 *   actionUrl?: string | null
 *   data?: Record<string, unknown>
 * }} opts
 */
export async function sendExpoPush({ token, title, message, actionUrl, data = {} }) {
  if (!isExpoPushToken(token)) {
    return { ok: false, error: 'Invalid Expo push token', provider: 'EXPO' }
  }

  const payload = {
    to: token,
    sound: 'default',
    title: String(title || 'ZSMS'),
    body: String(message || ''),
    data: {
      ...data,
      ...(actionUrl ? { actionUrl: String(actionUrl) } : {}),
    },
    channelId: 'default',
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        ok: false,
        error: json?.errors?.[0]?.message || json?.message || `Expo push HTTP ${res.status}`,
        provider: 'EXPO',
      }
    }

    const ticket = Array.isArray(json.data) ? json.data[0] : json.data
    if (ticket?.status === 'error') {
      return {
        ok: false,
        error: ticket.message || ticket.details?.error || 'Expo push rejected',
        provider: 'EXPO',
        providerId: ticket.id || null,
      }
    }

    return {
      ok: true,
      provider: 'EXPO',
      providerId: ticket?.id || null,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Expo push request failed',
      provider: 'EXPO',
    }
  }
}

/**
 * @param {{
 *   userId: string
 *   title: string
 *   message: string
 *   actionUrl?: string | null
 * }} opts
 * @param {import('@prisma/client').PrismaClient | any} prisma
 */
export async function sendExpoPushToUser(
  { userId, schoolId, title, message, actionUrl },
  prismaClient
) {
  const uid = String(userId || '').trim()
  if (!uid) return { ok: false, error: 'userId required', provider: 'EXPO' }

  const where = schoolId ? { id: uid, schoolId: String(schoolId) } : { id: uid }

  const user = await prismaClient.user.findFirst({
    where,
    select: { expoPushToken: true, schoolId: true },
  })
  if (!user?.expoPushToken) {
    return { ok: false, error: 'No Expo push token registered', provider: 'EXPO' }
  }
  return sendExpoPush({
    token: user.expoPushToken,
    title,
    message,
    actionUrl,
  })
}
