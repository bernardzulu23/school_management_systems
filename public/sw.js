importScripts('https://www.gstatic.com/toolbox/workbox-sw.js')

if (workbox) {
  console.log('Workbox is loaded')

  // Cache names
  const CACHE_NAME = 'zsms-app-shell-v1'
  const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/favicon.ico',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
  ]

  // Pre-cache the app shell and static assets
  workbox.precaching.preCacheCacheName = CACHE_NAME
  workbox.precaching.enqueue(STATIC_ASSETS)

  // Strategy for CSS, JS, and Images: Cache First, then Network
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'zsms-static-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  )

  // Strategy for Pages: StaleWhileRevalidate
  // This ensures the app loads instantly from cache, then updates in the background
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'zsms-pages-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 Day
        }),
      ],
    })
  )

  // Global Offline Fallback for Navigation Requests
  workbox.routing.setCatchHandler(({ event }) => {
    if (event.request.mode === 'navigate') {
      return workbox.precaching.getCache().match('/offline.html')
    }
    return Response.error()
  })
} else {
  console.error('Workbox failed to load')
}
