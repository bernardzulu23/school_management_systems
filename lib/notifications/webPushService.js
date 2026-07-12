import webpush from 'web-push'
import prisma from '@/lib/prisma'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@bluepeacktechnologies.com'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null
}

/**
 * @returns {{ ok: boolean, sent: number, failed: number, providerId?: string, error?: string }}
 */
export async function sendWebPushToUser({ userId, title, message, actionUrl }) {
  if (!ensureVapid()) {
    return { ok: false, sent: 0, failed: 0, error: 'Web push (VAPID) not configured' }
  }

  const subs = await prisma.webPushSubscription.findMany({
    where: { userId: String(userId) },
  })
  if (!subs.length) {
    return { ok: false, sent: 0, failed: 0, error: 'No web push subscriptions' }
  }

  const payload = JSON.stringify({
    title,
    body: message,
    url: actionUrl || '/dashboard',
  })

  let sent = 0
  let failed = 0
  let lastId = null
  const stale = []

  for (const sub of subs) {
    try {
      const result = await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
      sent += 1
      lastId = result?.headers?.location || sub.id
    } catch (error) {
      failed += 1
      const status = error?.statusCode
      if (status === 404 || status === 410) stale.push(sub.id)
    }
  }

  if (stale.length) {
    await prisma.webPushSubscription.deleteMany({ where: { id: { in: stale } } }).catch(() => {})
  }

  return {
    ok: sent > 0,
    sent,
    failed,
    providerId: lastId,
    provider: 'WEB_PUSH',
    error: sent === 0 ? 'All web push deliveries failed' : undefined,
  }
}

export async function upsertWebPushSubscription({ userId, schoolId, subscription }) {
  const endpoint = subscription?.endpoint
  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription payload')
  }

  return prisma.webPushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: String(userId),
      schoolId: String(schoolId),
      endpoint,
      p256dh,
      auth,
    },
    update: {
      userId: String(userId),
      schoolId: String(schoolId),
      p256dh,
      auth,
    },
  })
}
