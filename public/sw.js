const CACHE_VERSION = 'v3'
const STATIC_CACHE = `zsms-static-assets-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('zsms-static-assets-') && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const { request } = event
  const requestUrl = new URL(request.url)
  if (requestUrl.origin !== self.location.origin) return
  const isNavigation = request.mode === 'navigate'
  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(request.destination)

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE)
        return (await cache.match(OFFLINE_URL)) || Response.error()
      })
    )
    return
  }

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then(async (response) => {
            if (response && response.ok) {
              const cache = await caches.open(STATIC_CACHE)
              cache.put(request, response.clone()).catch(() => undefined)
            }
            return response
          })
          .catch(() => Response.error())
      })
    )
  }
})

self.addEventListener('push', (event) => {
  let payload = { title: 'ZSMS', body: 'You have a new notification', url: '/dashboard' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* ignore malformed payload */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'ZSMS', {
      body: payload.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { url: payload.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
      return undefined
    })
  )
})
