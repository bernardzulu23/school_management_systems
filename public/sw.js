// Service Worker for School Management System PWA
// Provides offline functionality, caching, and push notifications

const CACHE_NAME = 'school-ms-v1.0.0'
const STATIC_CACHE = 'school-ms-static-v1.0.0'
const DYNAMIC_CACHE = 'school-ms-dynamic-v1.0.0'

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/login',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add critical CSS and JS files
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js'
]

// API endpoints to cache
const CACHE_API_ENDPOINTS = [
  '/api/v1/dashboard/stats',
  '/api/v1/user/profile',
  '/api/v1/classes',
  '/api/v1/subjects',
  '/api/v1/attendance/recent',
  '/api/v1/grades/recent'
]

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('Service Worker: Error caching static files:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated successfully')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request))
})

// Handle API requests with cache-first strategy for specific endpoints
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  // Check if this endpoint should be cached
  const shouldCache = CACHE_API_ENDPOINTS.some(endpoint => 
    url.pathname.startsWith(endpoint)
  )

  if (shouldCache && request.method === 'GET') {
    try {
      // Try cache first
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        // Return cached version and update in background
        updateCacheInBackground(request)
        return cachedResponse
      }

      // If not in cache, fetch from network
      const networkResponse = await fetch(request)
      
      if (networkResponse.ok) {
        // Cache the response
        const cache = await caches.open(DYNAMIC_CACHE)
        cache.put(request, networkResponse.clone())
      }
      
      return networkResponse
    } catch (error) {
      console.log('Service Worker: API request failed, checking cache:', error)
      
      // Return cached version if available
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
      
      // Return offline response
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This data is not available offline',
          cached: false 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // For non-cached API requests, just try network
  try {
    return await fetch(request)
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Network Error', 
        message: 'Unable to connect to server' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Navigation request failed, serving offline page')
    
    // Check if we have the requested page cached
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Serve offline page
    const offlineResponse = await caches.match('/offline')
    return offlineResponse || new Response('Offline - Please check your connection')
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // If not cached, fetch from network
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Static request failed:', error)
    
    // Return cached version if available
    const cachedResponse = await caches.match(request)
    return cachedResponse || new Response('Resource not available offline')
  }
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
  } catch (error) {
    console.log('Service Worker: Background cache update failed:', error)
  }
}

// Push notification event
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received')
  
  let notificationData = {
    title: 'School Management System',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'school-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-24x24.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-24x24.png'
      }
    ]
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = { ...notificationData, ...data }
    } catch (error) {
      console.error('Service Worker: Error parsing push data:', error)
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked')
  
  event.notification.close()

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Background sync event
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered')
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

// Perform background sync
async function doBackgroundSync() {
  try {
    // Sync offline data when connection is restored
    console.log('Service Worker: Performing background sync')
    
    // Get offline data from IndexedDB
    const offlineData = await getOfflineData()
    
    if (offlineData.length > 0) {
      // Send offline data to server
      for (const data of offlineData) {
        try {
          await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body
          })
          
          // Remove from offline storage after successful sync
          await removeOfflineData(data.id)
        } catch (error) {
          console.error('Service Worker: Failed to sync data:', error)
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error)
  }
}

// Helper functions for offline data management
async function getOfflineData() {
  // Implementation would use IndexedDB to store offline data
  return []
}

async function removeOfflineData(id) {
  // Implementation would remove data from IndexedDB
  console.log('Service Worker: Removing offline data:', id)
}

// Message event for communication with main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})
