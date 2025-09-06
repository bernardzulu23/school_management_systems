/**
 * PWA Utilities - Progressive Web App functionality
 * Handles installation, offline detection, push notifications, and caching
 */

/**
 * PWA Installation Manager
 * Handles app installation prompts and detection
 */
export class PWAInstaller {
  constructor() {
    this.deferredPrompt = null
    this.isInstalled = false
    this.isInstallable = false
    
    this.init()
  }

  init() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Install prompt available')
      e.preventDefault()
      this.deferredPrompt = e
      this.isInstallable = true
      this.onInstallable()
    })

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed successfully')
      this.isInstalled = true
      this.deferredPrompt = null
      this.onInstalled()
    })

    // Check if already installed
    this.checkIfInstalled()
  }

  checkIfInstalled() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true
      return true
    }

    // Check if running as PWA on iOS
    if (window.navigator.standalone === true) {
      this.isInstalled = true
      return true
    }

    return false
  }

  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      console.log('PWA: No install prompt available')
      return false
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt()
      
      // Wait for user response
      const { outcome } = await this.deferredPrompt.userChoice
      console.log(`PWA: Install prompt outcome: ${outcome}`)
      
      // Clear the deferred prompt
      this.deferredPrompt = null
      this.isInstallable = false
      
      return outcome === 'accepted'
    } catch (error) {
      console.error('PWA: Error showing install prompt:', error)
      return false
    }
  }

  // Override these methods in your implementation
  onInstallable() {
    // Called when app becomes installable
    console.log('PWA: App is installable')
  }

  onInstalled() {
    // Called when app is installed
    console.log('PWA: App installed')
  }
}

/**
 * Offline Detection and Management
 * Monitors network status and provides offline functionality
 */
export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine
    this.offlineQueue = []
    this.callbacks = {
      online: [],
      offline: []
    }
    
    this.init()
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Network: Back online')
      this.isOnline = true
      this.onOnline()
    })

    window.addEventListener('offline', () => {
      console.log('Network: Gone offline')
      this.isOnline = false
      this.onOffline()
    })

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity()
    }, 30000) // Check every 30 seconds
  }

  async checkConnectivity() {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      const wasOnline = this.isOnline
      this.isOnline = response.ok
      
      if (!wasOnline && this.isOnline) {
        this.onOnline()
      } else if (wasOnline && !this.isOnline) {
        this.onOffline()
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false
        this.onOffline()
      }
    }
  }

  onOnline() {
    console.log('OfflineManager: Connection restored')
    this.callbacks.online.forEach(callback => callback())
    this.processOfflineQueue()
  }

  onOffline() {
    console.log('OfflineManager: Connection lost')
    this.callbacks.offline.forEach(callback => callback())
  }

  addOnlineCallback(callback) {
    this.callbacks.online.push(callback)
  }

  addOfflineCallback(callback) {
    this.callbacks.offline.push(callback)
  }

  queueRequest(request) {
    this.offlineQueue.push({
      ...request,
      timestamp: Date.now()
    })
    console.log('OfflineManager: Request queued for when online')
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return

    console.log(`OfflineManager: Processing ${this.offlineQueue.length} queued requests`)
    
    const queue = [...this.offlineQueue]
    this.offlineQueue = []

    for (const request of queue) {
      try {
        await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        })
        console.log('OfflineManager: Queued request processed successfully')
      } catch (error) {
        console.error('OfflineManager: Failed to process queued request:', error)
        // Re-queue failed requests
        this.offlineQueue.push(request)
      }
    }
  }
}

/**
 * Push Notification Manager
 * Handles push notification subscriptions and messaging
 */
export class NotificationManager {
  constructor() {
    this.subscription = null
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    this.permission = Notification.permission
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.log('Notifications: Not supported in this browser')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      
      if (permission === 'granted') {
        console.log('Notifications: Permission granted')
        return true
      } else {
        console.log('Notifications: Permission denied')
        return false
      }
    } catch (error) {
      console.error('Notifications: Error requesting permission:', error)
      return false
    }
  }

  async subscribe(vapidPublicKey) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.log('Notifications: Cannot subscribe - not supported or no permission')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      })

      this.subscription = subscription
      console.log('Notifications: Subscribed successfully')
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)
      
      return subscription
    } catch (error) {
      console.error('Notifications: Error subscribing:', error)
      return null
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      console.log('Notifications: No active subscription to unsubscribe')
      return true
    }

    try {
      await this.subscription.unsubscribe()
      this.subscription = null
      console.log('Notifications: Unsubscribed successfully')
      return true
    } catch (error) {
      console.error('Notifications: Error unsubscribing:', error)
      return false
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      })
      console.log('Notifications: Subscription sent to server')
    } catch (error) {
      console.error('Notifications: Error sending subscription to server:', error)
    }
  }

  showLocalNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.log('Notifications: Cannot show notification - no permission')
      return
    }

    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      ...options
    })

    // Auto-close after 5 seconds if not interacted with
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

/**
 * Cache Manager
 * Manages application caching and offline data storage
 */
export class CacheManager {
  constructor() {
    this.cacheName = 'school-ms-data-v1.0.0'
    this.isSupported = 'caches' in window
  }

  async cacheData(key, data, ttl = 3600000) { // Default TTL: 1 hour
    if (!this.isSupported) return false

    try {
      const cache = await caches.open(this.cacheName)
      const response = new Response(JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl
      }))
      
      await cache.put(key, response)
      console.log(`Cache: Data cached for key: ${key}`)
      return true
    } catch (error) {
      console.error('Cache: Error caching data:', error)
      return false
    }
  }

  async getCachedData(key) {
    if (!this.isSupported) return null

    try {
      const cache = await caches.open(this.cacheName)
      const response = await cache.match(key)
      
      if (!response) return null

      const cachedData = await response.json()
      const now = Date.now()
      
      // Check if data has expired
      if (now - cachedData.timestamp > cachedData.ttl) {
        await cache.delete(key)
        console.log(`Cache: Expired data removed for key: ${key}`)
        return null
      }

      console.log(`Cache: Data retrieved for key: ${key}`)
      return cachedData.data
    } catch (error) {
      console.error('Cache: Error retrieving cached data:', error)
      return null
    }
  }

  async clearCache() {
    if (!this.isSupported) return false

    try {
      await caches.delete(this.cacheName)
      console.log('Cache: Cache cleared successfully')
      return true
    } catch (error) {
      console.error('Cache: Error clearing cache:', error)
      return false
    }
  }

  async getCacheSize() {
    if (!this.isSupported) return 0

    try {
      const cache = await caches.open(this.cacheName)
      const keys = await cache.keys()
      return keys.length
    } catch (error) {
      console.error('Cache: Error getting cache size:', error)
      return 0
    }
  }
}

/**
 * PWA Manager
 * Main class that coordinates all PWA functionality
 */
export class PWAManager {
  constructor() {
    this.installer = new PWAInstaller()
    this.offlineManager = new OfflineManager()
    this.notificationManager = new NotificationManager()
    this.cacheManager = new CacheManager()
    
    this.init()
  }

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('PWA: Service worker registered successfully')
        
        // Update service worker when new version is available
        registration.addEventListener('updatefound', () => {
          console.log('PWA: New service worker version available')
          this.onUpdateAvailable()
        })
      } catch (error) {
        console.error('PWA: Service worker registration failed:', error)
      }
    }

    // Setup offline callbacks
    this.offlineManager.addOnlineCallback(() => {
      this.onOnline()
    })

    this.offlineManager.addOfflineCallback(() => {
      this.onOffline()
    })
  }

  // Override these methods in your implementation
  onUpdateAvailable() {
    console.log('PWA: Update available')
  }

  onOnline() {
    console.log('PWA: Back online')
  }

  onOffline() {
    console.log('PWA: Gone offline')
  }

  // Convenience methods
  get isOnline() {
    return this.offlineManager.isOnline
  }

  get isInstalled() {
    return this.installer.isInstalled
  }

  get isInstallable() {
    return this.installer.isInstallable
  }

  async showInstallPrompt() {
    return this.installer.showInstallPrompt()
  }

  async requestNotificationPermission() {
    return this.notificationManager.requestPermission()
  }

  showNotification(title, options) {
    return this.notificationManager.showLocalNotification(title, options)
  }
}
