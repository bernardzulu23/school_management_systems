/**
 * Browser helpers for VAPID web push subscription.
 */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function ensureServiceWorker() {
  if (!isWebPushSupported()) return null
  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js')
  }
  await navigator.serviceWorker.ready
  return reg
}

export async function fetchVapidPublicKey() {
  const res = await fetch('/api/notifications/web-push/vapid-public-key', {
    credentials: 'omit',
    cache: 'default',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Could not load VAPID key')
  return json.publicKey || null
}

/**
 * Request permission, subscribe, and persist endpoint on the server.
 * @returns {{ ok: boolean, error?: string }}
 */
export async function subscribeToWebPush() {
  if (!isWebPushSupported()) {
    return { ok: false, error: 'Web push is not supported in this browser' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Notification permission was denied' }
  }

  const publicKey = await fetchVapidPublicKey()
  if (!publicKey) {
    return { ok: false, error: 'Web push is not configured on the server (missing VAPID keys)' }
  }

  const registration = await ensureServiceWorker()
  if (!registration) {
    return { ok: false, error: 'Service worker could not be registered' }
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const res = await fetch('/api/notifications/web-push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: json.error || 'Failed to save push subscription' }
  }

  return { ok: true }
}

export const NOTIFICATION_TYPE_LABELS = {
  CLASS_REMINDER: 'Class reminder',
  DEPARTMENT_MEETING_REMINDER: 'Department meeting',
  TEST_SCHEDULED: 'Test scheduled',
  TEST_DATE_REMINDER: 'Test reminder',
  MISSED_TEST_ALERT: 'Missed test',
  SCHEME_PROGRESS: 'Scheme progress',
  LOW_MASTERY_ALERT: 'Low mastery',
  LESSON_ASSIGNED: 'Lesson assigned',
}

export function formatNotificationType(type) {
  return NOTIFICATION_TYPE_LABELS[type] || String(type || 'Notification').replace(/_/g, ' ')
}
