/**
 * 7-Day Offline Mode System for Rural Zambian Schools
 * Provides complete functionality without internet connectivity for extended periods
 * Designed for schools with unreliable power and internet infrastructure
 */

export class OfflineSystem {
  constructor() {
    this.isOnline = navigator.onLine
    this.offlineStartTime = null
    this.maxOfflineDays = 7
    this.dataStorage = new OfflineDataStorage()
    this.syncQueue = new OfflineSyncQueue()
    this.compressionEngine = new DataCompressionEngine()
    this.conflictResolver = new OfflineConflictResolver()
    
    this.initializeOfflineCapabilities()
    this.setupNetworkListeners()
    this.startOfflineMonitoring()
  }

  /**
   * Initialize offline capabilities
   */
  initializeOfflineCapabilities() {
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/offline-service-worker.js')
        .then(registration => {
          console.log('Offline service worker registered:', registration)
          this.serviceWorker = registration
        })
        .catch(error => {
          console.error('Service worker registration failed:', error)
        })
    }

    // Initialize offline storage
    this.dataStorage.initialize()
    
    // Load cached data
    this.loadOfflineData()
    
    // Setup periodic data compression
    setInterval(() => {
      this.compressStoredData()
    }, 6 * 60 * 60 * 1000) // Every 6 hours
  }

  /**
   * Setup network connectivity listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored')
      this.handleOnlineMode()
    })

    window.addEventListener('offline', () => {
      console.log('📴 Network connection lost - entering offline mode')
      this.handleOfflineMode()
    })

    // Check connectivity every 30 seconds
    setInterval(() => {
      this.checkConnectivity()
    }, 30000)
  }

  /**
   * Handle transition to offline mode
   */
  handleOfflineMode() {
    this.isOnline = false
    this.offlineStartTime = new Date()
    
    // Enable ultra-low power mode
    this.enableUltraLowPowerMode()
    
    // Compress existing data
    this.compressStoredData()
    
    // Notify user
    this.showOfflineNotification()
    
    // Start offline data management
    this.startOfflineDataManagement()
  }

  /**
   * Handle transition to online mode
   */
  async handleOnlineMode() {
    this.isOnline = true
    const offlineDuration = this.offlineStartTime ? 
      (new Date() - this.offlineStartTime) / (1000 * 60 * 60 * 24) : 0
    
    console.log(`📡 Reconnected after ${offlineDuration.toFixed(1)} days offline`)
    
    // Disable ultra-low power mode
    this.disableUltraLowPowerMode()
    
    // Start data synchronization
    await this.synchronizeOfflineData()
    
    // Clear offline notification
    this.clearOfflineNotification()
    
    this.offlineStartTime = null
  }

  /**
   * Enable ultra-low power mode to extend battery life
   */
  enableUltraLowPowerMode() {
    // Reduce screen brightness
    if (document.body.style) {
      document.body.style.filter = 'brightness(0.7)'
    }
    
    // Disable animations
    document.documentElement.style.setProperty('--animation-duration', '0s')
    
    // Reduce update frequency
    this.updateInterval = 60000 // 1 minute instead of real-time
    
    // Disable non-essential features
    this.disableNonEssentialFeatures()
    
    console.log('🔋 Ultra-low power mode enabled')
  }

  /**
   * Disable ultra-low power mode
   */
  disableUltraLowPowerMode() {
    // Restore normal brightness
    if (document.body.style) {
      document.body.style.filter = 'brightness(1)'
    }
    
    // Re-enable animations
    document.documentElement.style.removeProperty('--animation-duration')
    
    // Restore normal update frequency
    this.updateInterval = 5000 // 5 seconds
    
    // Re-enable all features
    this.enableAllFeatures()
    
    console.log('🔋 Ultra-low power mode disabled')
  }

  /**
   * Store data for offline access
   */
  async storeOfflineData(dataType, data, priority = 'normal') {
    const compressedData = await this.compressionEngine.compress(data)
    const storageKey = `offline_${dataType}_${Date.now()}`
    
    const offlineEntry = {
      key: storageKey,
      dataType,
      data: compressedData,
      originalSize: JSON.stringify(data).length,
      compressedSize: JSON.stringify(compressedData).length,
      priority,
      timestamp: new Date().toISOString(),
      synced: false,
      version: 1
    }
    
    await this.dataStorage.store(storageKey, offlineEntry)
    
    // Add to sync queue for when online
    this.syncQueue.add({
      action: 'store',
      dataType,
      data,
      timestamp: offlineEntry.timestamp,
      priority
    })
    
    return storageKey
  }

  /**
   * Retrieve data from offline storage
   */
  async getOfflineData(dataType, filters = {}) {
    const allData = await this.dataStorage.getByType(dataType)
    
    // Apply filters
    let filteredData = allData
    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.timestamp)
        return itemDate >= filters.dateRange.start && itemDate <= filters.dateRange.end
      })
    }
    
    if (filters.priority) {
      filteredData = filteredData.filter(item => item.priority === filters.priority)
    }
    
    // Decompress data
    const decompressedData = await Promise.all(
      filteredData.map(async item => ({
        ...item,
        data: await this.compressionEngine.decompress(item.data)
      }))
    )
    
    return decompressedData
  }

  /**
   * Update existing offline data
   */
  async updateOfflineData(dataType, id, updates) {
    const existingData = await this.dataStorage.get(`offline_${dataType}_${id}`)
    
    if (existingData) {
      const updatedData = { ...existingData.data, ...updates }
      const compressedData = await this.compressionEngine.compress(updatedData)
      
      const updatedEntry = {
        ...existingData,
        data: compressedData,
        timestamp: new Date().toISOString(),
        version: existingData.version + 1,
        synced: false
      }
      
      await this.dataStorage.store(existingData.key, updatedEntry)
      
      // Add to sync queue
      this.syncQueue.add({
        action: 'update',
        dataType,
        id,
        data: updatedData,
        timestamp: updatedEntry.timestamp,
        priority: existingData.priority
      })
      
      return updatedEntry.key
    }
    
    return null
  }

  /**
   * Delete offline data
   */
  async deleteOfflineData(dataType, id) {
    const key = `offline_${dataType}_${id}`
    const deleted = await this.dataStorage.delete(key)
    
    if (deleted) {
      // Add to sync queue
      this.syncQueue.add({
        action: 'delete',
        dataType,
        id,
        timestamp: new Date().toISOString(),
        priority: 'high'
      })
    }
    
    return deleted
  }

  /**
   * Synchronize offline data when connection is restored
   */
  async synchronizeOfflineData() {
    console.log('🔄 Starting offline data synchronization...')
    
    const syncItems = this.syncQueue.getAll()
    const totalItems = syncItems.length
    let syncedItems = 0
    let failedItems = 0
    
    // Group by priority
    const highPriority = syncItems.filter(item => item.priority === 'high')
    const normalPriority = syncItems.filter(item => item.priority === 'normal')
    const lowPriority = syncItems.filter(item => item.priority === 'low')
    
    // Sync in priority order
    for (const priorityGroup of [highPriority, normalPriority, lowPriority]) {
      for (const item of priorityGroup) {
        try {
          await this.syncSingleItem(item)
          syncedItems++
          
          // Update progress
          this.updateSyncProgress(syncedItems, totalItems)
          
          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          console.error(`Failed to sync item:`, error)
          failedItems++
          
          // Keep failed items in queue for retry
          if (item.retryCount < 3) {
            item.retryCount = (item.retryCount || 0) + 1
            this.syncQueue.add(item)
          }
        }
      }
    }
    
    console.log(`✅ Sync completed: ${syncedItems} synced, ${failedItems} failed`)
    
    // Clear successfully synced items
    this.syncQueue.clear()
    
    return { syncedItems, failedItems, totalItems }
  }

  /**
   * Sync a single item to the server
   */
  async syncSingleItem(item) {
    const endpoint = this.getApiEndpoint(item.dataType, item.action)
    
    let response
    switch (item.action) {
      case 'store':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        })
        break
        
      case 'update':
        response = await fetch(`${endpoint}/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        })
        break
        
      case 'delete':
        response = await fetch(`${endpoint}/${item.id}`, {
          method: 'DELETE'
        })
        break
        
      default:
        throw new Error(`Unknown sync action: ${item.action}`)
    }
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  }

  /**
   * Get API endpoint for data type and action
   */
  getApiEndpoint(dataType, action) {
    const baseUrl = process.env.REACT_APP_API_URL || '/api'
    const endpoints = {
      'student_data': `${baseUrl}/students`,
      'teacher_data': `${baseUrl}/teachers`,
      'attendance': `${baseUrl}/attendance`,
      'grades': `${baseUrl}/grades`,
      'assignments': `${baseUrl}/assignments`,
      'timetable': `${baseUrl}/timetable`,
      'communication': `${baseUrl}/messages`,
      'wellbeing': `${baseUrl}/wellbeing`,
      'gamification': `${baseUrl}/gamification`
    }
    
    return endpoints[dataType] || `${baseUrl}/data`
  }

  /**
   * Compress stored data to save space
   */
  async compressStoredData() {
    console.log('🗜️ Compressing stored data...')
    
    const allData = await this.dataStorage.getAll()
    let totalSaved = 0
    
    for (const [key, data] of Object.entries(allData)) {
      if (!data.compressed) {
        const originalSize = JSON.stringify(data).length
        const compressedData = await this.compressionEngine.compress(data.data)
        
        const updatedEntry = {
          ...data,
          data: compressedData,
          compressed: true,
          originalSize,
          compressedSize: JSON.stringify(compressedData).length
        }
        
        await this.dataStorage.store(key, updatedEntry)
        totalSaved += originalSize - updatedEntry.compressedSize
      }
    }
    
    console.log(`💾 Compression saved ${(totalSaved / 1024).toFixed(2)} KB`)
  }

  /**
   * Check available storage space
   */
  async checkStorageSpace() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2)
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2)
      const usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(1)
      
      console.log(`💾 Storage: ${usedMB}MB / ${quotaMB}MB (${usagePercent}%)`)
      
      // Warn if storage is getting full
      if (usagePercent > 80) {
        this.handleLowStorage()
      }
      
      return { used: usedMB, quota: quotaMB, percentage: usagePercent }
    }
    
    return null
  }

  /**
   * Handle low storage situation
   */
  async handleLowStorage() {
    console.log('⚠️ Low storage detected - cleaning up old data')
    
    // Remove old, synced data
    const allData = await this.dataStorage.getAll()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.maxOfflineDays)
    
    let deletedCount = 0
    for (const [key, data] of Object.entries(allData)) {
      if (data.synced && new Date(data.timestamp) < cutoffDate) {
        await this.dataStorage.delete(key)
        deletedCount++
      }
    }
    
    console.log(`🗑️ Cleaned up ${deletedCount} old entries`)
  }

  /**
   * Get offline system status
   */
  getOfflineStatus() {
    const offlineDuration = this.offlineStartTime ? 
      (new Date() - this.offlineStartTime) / (1000 * 60 * 60 * 24) : 0
    
    return {
      isOnline: this.isOnline,
      offlineDuration: offlineDuration.toFixed(1),
      maxOfflineDays: this.maxOfflineDays,
      remainingOfflineDays: Math.max(0, this.maxOfflineDays - offlineDuration).toFixed(1),
      ultraLowPowerMode: this.updateInterval > 30000,
      syncQueueSize: this.syncQueue.size(),
      storageUsage: this.checkStorageSpace()
    }
  }

  /**
   * Show offline notification to user
   */
  showOfflineNotification() {
    const notification = document.createElement('div')
    notification.id = 'offline-notification'
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b35;
        color: white;
        padding: 10px;
        text-align: center;
        z-index: 10000;
        font-weight: bold;
      ">
        📴 OFFLINE MODE - Data will sync when connection returns
        <button onclick="this.parentElement.style.display='none'" style="
          float: right;
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        ">×</button>
      </div>
    `
    
    document.body.appendChild(notification)
  }

  /**
   * Clear offline notification
   */
  clearOfflineNotification() {
    const notification = document.getElementById('offline-notification')
    if (notification) {
      notification.remove()
    }
  }

  /**
   * Update sync progress
   */
  updateSyncProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100)
    console.log(`🔄 Sync progress: ${completed}/${total} (${percentage}%)`)
    
    // Emit progress event for UI updates
    window.dispatchEvent(new CustomEvent('offline-sync-progress', {
      detail: { completed, total, percentage }
    }))
  }

  /**
   * Start offline monitoring
   */
  startOfflineMonitoring() {
    setInterval(() => {
      const status = this.getOfflineStatus()
      
      // Warn if approaching offline limit
      if (status.remainingOfflineDays < 1 && !this.isOnline) {
        console.warn('⚠️ Approaching offline time limit')
        this.showLowOfflineTimeWarning()
      }
      
      // Check storage space
      this.checkStorageSpace()
      
    }, 60000) // Check every minute
  }

  /**
   * Show warning when offline time is running low
   */
  showLowOfflineTimeWarning() {
    const warning = document.createElement('div')
    warning.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #ff9500;
        color: white;
        padding: 15px;
        border-radius: 5px;
        max-width: 300px;
        z-index: 10000;
      ">
        ⚠️ <strong>Low Offline Time</strong><br>
        Please connect to internet soon to sync data
        <button onclick="this.parentElement.remove()" style="
          float: right;
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        ">×</button>
      </div>
    `
    
    document.body.appendChild(warning)
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove()
      }
    }, 10000)
  }

  /**
   * Check network connectivity
   */
  async checkConnectivity() {
    try {
      // Try to fetch a small resource
      const response = await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      })
      
      const wasOffline = !this.isOnline
      this.isOnline = response.ok
      
      if (wasOffline && this.isOnline) {
        this.handleOnlineMode()
      } else if (!wasOffline && !this.isOnline) {
        this.handleOfflineMode()
      }
      
    } catch (error) {
      if (this.isOnline) {
        this.handleOfflineMode()
      }
    }
  }

  /**
   * Disable non-essential features in ultra-low power mode
   */
  disableNonEssentialFeatures() {
    // Disable animations
    const style = document.createElement('style')
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
    document.head.appendChild(style)
    
    // Reduce image quality
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      img.style.filter = 'contrast(0.8) brightness(0.9)'
    })
  }

  /**
   * Re-enable all features
   */
  enableAllFeatures() {
    // Remove animation restrictions
    const styles = document.querySelectorAll('style')
    styles.forEach(style => {
      if (style.innerHTML.includes('animation-duration: 0s')) {
        style.remove()
      }
    })
    
    // Restore image quality
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      img.style.filter = ''
    })
  }

  /**
   * Load cached offline data on initialization
   */
  async loadOfflineData() {
    console.log('📂 Loading cached offline data...')
    
    try {
      const cachedData = await this.dataStorage.getAll()
      const dataCount = Object.keys(cachedData).length
      
      console.log(`📂 Loaded ${dataCount} cached entries`)
      
      // Emit event for UI to update with cached data
      window.dispatchEvent(new CustomEvent('offline-data-loaded', {
        detail: { dataCount, cachedData }
      }))
      
    } catch (error) {
      console.error('Failed to load cached data:', error)
    }
  }
}

/**
 * Offline Data Storage using IndexedDB for large data storage
 */
class OfflineDataStorage {
  constructor() {
    this.dbName = 'ZambianSchoolOfflineDB'
    this.dbVersion = 1
    this.db = null
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create object stores for different data types
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'key' })
          store.createIndex('dataType', 'dataType', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('priority', 'priority', { unique: false })
        }
      }
    })
  }

  async store(key, data) {
    const transaction = this.db.transaction(['offlineData'], 'readwrite')
    const store = transaction.objectStore('offlineData')
    return store.put({ key, ...data })
  }

  async get(key) {
    const transaction = this.db.transaction(['offlineData'], 'readonly')
    const store = transaction.objectStore('offlineData')
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getByType(dataType) {
    const transaction = this.db.transaction(['offlineData'], 'readonly')
    const store = transaction.objectStore('offlineData')
    const index = store.index('dataType')

    return new Promise((resolve, reject) => {
      const request = index.getAll(dataType)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll() {
    const transaction = this.db.transaction(['offlineData'], 'readonly')
    const store = transaction.objectStore('offlineData')

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const result = {}
        request.result.forEach(item => {
          result[item.key] = item
        })
        resolve(result)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async delete(key) {
    const transaction = this.db.transaction(['offlineData'], 'readwrite')
    const store = transaction.objectStore('offlineData')
    return store.delete(key)
  }
}

/**
 * Offline Sync Queue for managing pending synchronization
 */
class OfflineSyncQueue {
  constructor() {
    this.queue = []
    this.storageKey = 'offline_sync_queue'
    this.loadQueue()
  }

  add(item) {
    this.queue.push({
      ...item,
      id: this.generateId(),
      addedAt: new Date().toISOString()
    })
    this.saveQueue()
  }

  getAll() {
    return [...this.queue]
  }

  remove(id) {
    this.queue = this.queue.filter(item => item.id !== id)
    this.saveQueue()
  }

  clear() {
    this.queue = []
    this.saveQueue()
  }

  size() {
    return this.queue.length
  }

  loadQueue() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      this.queue = saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Failed to load sync queue:', error)
      this.queue = []
    }
  }

  saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue))
    } catch (error) {
      console.error('Failed to save sync queue:', error)
    }
  }

  generateId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Data Compression Engine for reducing storage space
 */
class DataCompressionEngine {
  async compress(data) {
    try {
      // Simple JSON compression using string replacement
      const jsonString = JSON.stringify(data)

      // Replace common patterns to reduce size
      const compressed = jsonString
        .replace(/"timestamp":/g, '"ts":')
        .replace(/"student_id":/g, '"sid":')
        .replace(/"teacher_id":/g, '"tid":')
        .replace(/"class_id":/g, '"cid":')
        .replace(/"subject_id":/g, '"subid":')
        .replace(/"assignment_id":/g, '"aid":')
        .replace(/true/g, '1')
        .replace(/false/g, '0')
        .replace(/null/g, 'n')

      return {
        compressed: true,
        data: compressed,
        originalSize: jsonString.length,
        compressedSize: compressed.length,
        compressionRatio: (compressed.length / jsonString.length * 100).toFixed(2)
      }
    } catch (error) {
      console.error('Compression failed:', error)
      return data
    }
  }

  async decompress(compressedData) {
    try {
      if (!compressedData.compressed) {
        return compressedData
      }

      // Reverse the compression
      const decompressed = compressedData.data
        .replace(/"ts":/g, '"timestamp":')
        .replace(/"sid":/g, '"student_id":')
        .replace(/"tid":/g, '"teacher_id":')
        .replace(/"cid":/g, '"class_id":')
        .replace(/"subid":/g, '"subject_id":')
        .replace(/"aid":/g, '"assignment_id":')
        .replace(/(?<!")1(?!")/g, 'true')
        .replace(/(?<!")0(?!")/g, 'false')
        .replace(/(?<!")n(?!")/g, 'null')

      return JSON.parse(decompressed)
    } catch (error) {
      console.error('Decompression failed:', error)
      return compressedData
    }
  }
}

/**
 * Offline Conflict Resolver for handling data conflicts
 */
class OfflineConflictResolver {
  constructor() {
    this.strategies = {
      'timestamp': this.timestampStrategy,
      'user_priority': this.userPriorityStrategy,
      'merge': this.mergeStrategy,
      'manual': this.manualStrategy
    }
  }

  resolve(localData, remoteData, strategy = 'timestamp') {
    const resolver = this.strategies[strategy]
    if (!resolver) {
      console.warn(`Unknown conflict resolution strategy: ${strategy}`)
      return this.timestampStrategy(localData, remoteData)
    }

    return resolver(localData, remoteData)
  }

  timestampStrategy(localData, remoteData) {
    const localTime = new Date(localData.timestamp || 0)
    const remoteTime = new Date(remoteData.timestamp || 0)

    return localTime > remoteTime ? localData : remoteData
  }

  userPriorityStrategy(localData, remoteData) {
    // Prefer user-initiated changes over system changes
    if (localData.userInitiated && !remoteData.userInitiated) {
      return localData
    }
    if (!localData.userInitiated && remoteData.userInitiated) {
      return remoteData
    }

    // Fall back to timestamp
    return this.timestampStrategy(localData, remoteData)
  }

  mergeStrategy(localData, remoteData) {
    // Merge non-conflicting fields
    const merged = { ...remoteData, ...localData }
    merged.timestamp = new Date().toISOString()
    merged.merged = true

    return merged
  }

  manualStrategy(localData, remoteData) {
    // Return both for manual resolution
    return {
      conflict: true,
      local: localData,
      remote: remoteData,
      requiresManualResolution: true
    }
  }
}

// Export singleton instance
export const offlineSystem = new OfflineSystem()
