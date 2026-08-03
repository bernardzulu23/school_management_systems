const CACHE_VERSION = 'v6'
const STATIC_CACHE = `zsms-static-assets-${CACHE_VERSION}`
const PAGES_CACHE = `zsms-app-shells-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'

/** Role shells cached after an online visit (network-first, offline fallback). */
const APP_SHELL_PATHS = [
  '/dashboard',
  '/dashboard/offline',
  '/dashboard/attendance',
  '/dashboard/teacher',
  '/dashboard/teacher/results',
  '/dashboard/teacher/assessments/ecz',
  '/dashboard/teacher/assessments/cbc',
  '/dashboard/teacher/materials',
  '/dashboard/teacher/lesson-planner',
  '/dashboard/teacher/lesson-plans',
  '/dashboard/student',
  '/dashboard/student/flashcards',
  '/dashboard/student/materials',
  '/dashboard/student/results',
  '/dashboard/parent',
  '/dashboard/parent/results',
  '/dashboard/parent/attendance',
  '/dashboard/parent/fees',
  '/dashboard/hod',
  '/dashboard/results',
  '/dashboard/classes',
  '/login',
]

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

function isAppShell(pathname) {
  return APP_SHELL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`)
  )
}

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
            .filter(
              (key) =>
                (key.startsWith('zsms-static-assets-') ||
                  key.startsWith('zsms-teacher-pages-') ||
                  key.startsWith('zsms-app-shells-')) &&
                key !== STATIC_CACHE &&
                key !== PAGES_CACHE
            )
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
      (async () => {
        try {
          const response = await fetch(request)
          if (response && response.ok && isAppShell(requestUrl.pathname)) {
            const cache = await caches.open(PAGES_CACHE)
            cache.put(request, response.clone()).catch(() => undefined)
          }
          return response
        } catch {
          const pages = await caches.open(PAGES_CACHE)
          const cachedPage = await pages.match(request)
          if (cachedPage) return cachedPage
          const keys = await pages.keys()
          for (const key of keys) {
            try {
              if (new URL(key.url).pathname === requestUrl.pathname) {
                const hit = await pages.match(key)
                if (hit) return hit
              }
            } catch {
              /* ignore */
            }
          }
          const staticCache = await caches.open(STATIC_CACHE)
          return (await staticCache.match(OFFLINE_URL)) || Response.error()
        }
      })()
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
