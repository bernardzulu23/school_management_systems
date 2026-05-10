importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js')

if (self.workbox) {
  const CACHE_VERSION = 'v2'
  const STATIC_CACHE = `zsms-static-assets-${CACHE_VERSION}`
  const PAGES_CACHE = `zsms-pages-cache-${CACHE_VERSION}`

  self.workbox.core.skipWaiting()
  self.workbox.core.clientsClaim()

  // Pre-cache shell assets and offline page.
  self.workbox.precaching.precacheAndRoute([
    { url: '/offline.html', revision: CACHE_VERSION },
    { url: '/manifest.json', revision: CACHE_VERSION },
    { url: '/favicon.ico', revision: CACHE_VERSION },
    { url: '/icons/icon-192x192.png', revision: CACHE_VERSION },
    { url: '/icons/icon-512x512.png', revision: CACHE_VERSION },
  ])

  self.workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image',
    new self.workbox.strategies.CacheFirst({
      cacheName: STATIC_CACHE,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    })
  )

  self.workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: PAGES_CACHE,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    })
  )

  self.workbox.routing.setCatchHandler(async ({ event }) => {
    if (event.request.mode === 'navigate') {
      const cachedOffline = await caches.match('/offline.html')
      return cachedOffline || Response.redirect('/offline.html')
    }
    return Response.error()
  })
} else {
  console.error('Workbox failed to load')
}
