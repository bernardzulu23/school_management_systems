/**
 * Offline Storage Manager for School Management System
 * Handles local data storage and synchronization for offline functionality
 */

class OfflineStorageManager {
  constructor() {
    this.dbName = 'SchoolManagementDB'
    this.dbVersion = 1
    this.db = null
    this.isOnline = navigator.onLine
    this.syncQueue = []
    
    // Initialize database and sync monitoring
    this.initDatabase()
    this.setupOnlineListener()
  }

  /**
   * Initialize IndexedDB database
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ Offline database initialized')
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create object stores for different data types
        this.createObjectStores(db)
      }
    })
  }

  /**
   * Create object stores for offline data
   */
  createObjectStores(db) {
    // User data store
    if (!db.objectStoreNames.contains('users')) {
      const userStore = db.createObjectStore('users', { keyPath: 'id' })
      userStore.createIndex('email', 'email', { unique: true })
      userStore.createIndex('role', 'role', { unique: false })
    }

    // Student data store
    if (!db.objectStoreNames.contains('students')) {
      const studentStore = db.createObjectStore('students', { keyPath: 'id' })
      studentStore.createIndex('class', 'class', { unique: false })
      studentStore.createIndex('grade', 'grade', { unique: false })
    }

    // Grades and assessments store
    if (!db.objectStoreNames.contains('grades')) {
      const gradeStore = db.createObjectStore('grades', { keyPath: 'id' })
      gradeStore.createIndex('student_id', 'student_id', { unique: false })
      gradeStore.createIndex('subject', 'subject', { unique: false })
      gradeStore.createIndex('term', 'term', { unique: false })
    }

    // Attendance records store
    if (!db.objectStoreNames.contains('attendance')) {
      const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' })
      attendanceStore.createIndex('student_id', 'student_id', { unique: false })
      attendanceStore.createIndex('date', 'date', { unique: false })
    }

    // Dashboard statistics store
    if (!db.objectStoreNames.contains('dashboard_stats')) {
      const statsStore = db.createObjectStore('dashboard_stats', { keyPath: 'id' })
      statsStore.createIndex('user_id', 'user_id', { unique: false })
      statsStore.createIndex('type', 'type', { unique: false })
    }

    // Sync queue for offline actions
    if (!db.objectStoreNames.contains('sync_queue')) {
      const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
      syncStore.createIndex('action', 'action', { unique: false })
      syncStore.createIndex('timestamp', 'timestamp', { unique: false })
    }

    // Gamification data store
    if (!db.objectStoreNames.contains('gamification')) {
      const gameStore = db.createObjectStore('gamification', { keyPath: 'id' })
      gameStore.createIndex('student_id', 'student_id', { unique: false })
      gameStore.createIndex('achievement_type', 'achievement_type', { unique: false })
    }

    console.log('📦 Object stores created for offline functionality')
  }

  /**
   * Store data locally for offline access
   */
  async storeData(storeName, data) {
    if (!this.db) await this.initDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      // Store single item or array of items
      if (Array.isArray(data)) {
        data.forEach(item => {
          item.cached_at = new Date().toISOString()
          store.put(item)
        })
      } else {
        data.cached_at = new Date().toISOString()
        store.put(data)
      }
      
      transaction.oncomplete = () => {
        console.log(`💾 Data stored offline in ${storeName}:`, data)
        resolve(true)
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Retrieve data from local storage
   */
  async getData(storeName, key = null) {
    if (!this.db) await this.initDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      
      let request
      if (key) {
        request = store.get(key)
      } else {
        request = store.getAll()
      }
      
      request.onsuccess = () => {
        const result = request.result
        console.log(`📖 Data retrieved from ${storeName}:`, result)
        resolve(result)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get data by index
   */
  async getDataByIndex(storeName, indexName, value) {
    if (!this.db) await this.initDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Add action to sync queue for when online
   */
  async addToSyncQueue(action, data) {
    const syncItem = {
      action: action,
      data: data,
      timestamp: new Date().toISOString(),
      attempts: 0,
      status: 'pending'
    }
    
    await this.storeData('sync_queue', syncItem)
    console.log('📤 Action queued for sync:', action)
  }

  /**
   * Process sync queue when online
   */
  async processSyncQueue() {
    if (!this.isOnline) return
    
    const queueItems = await this.getData('sync_queue')
    console.log(`🔄 Processing ${queueItems.length} queued actions`)
    
    for (const item of queueItems) {
      if (item.status === 'pending' && item.attempts < 3) {
        try {
          await this.syncAction(item)
          await this.removeFromSyncQueue(item.id)
        } catch (error) {
          console.error('❌ Sync failed for item:', item, error)
          item.attempts++
          await this.storeData('sync_queue', item)
        }
      }
    }
  }

  /**
   * Sync individual action with server
   */
  async syncAction(item) {
    const { action, data } = item
    
    switch (action) {
      case 'CREATE_GRADE':
        await fetch('/api/v1/grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        break
        
      case 'UPDATE_ATTENDANCE':
        await fetch(`/api/v1/attendance/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        break
        
      case 'CREATE_ACHIEVEMENT':
        await fetch('/api/v1/gamification/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        break
        
      default:
        console.warn('Unknown sync action:', action)
    }
    
    console.log('✅ Synced action:', action)
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(id) {
    if (!this.db) await this.initDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.delete(id)
      
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Setup online/offline event listeners
   */
  setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('🌐 Back online - processing sync queue')
      this.isOnline = true
      this.processSyncQueue()
    })
    
    window.addEventListener('offline', () => {
      console.log('📴 Gone offline - enabling offline mode')
      this.isOnline = false
    })
  }

  /**
   * Check if data is fresh (less than 1 hour old)
   */
  isDataFresh(data, maxAge = 3600000) { // 1 hour default
    if (!data.cached_at) return false
    const cacheTime = new Date(data.cached_at).getTime()
    const now = new Date().getTime()
    return (now - cacheTime) < maxAge
  }

  /**
   * Get offline-capable dashboard data
   */
  async getDashboardData(userId) {
    try {
      // Try to get fresh data from server if online
      if (this.isOnline) {
        const response = await fetch(`/api/v1/dashboard/stats?user_id=${userId}`)
        if (response.ok) {
          const data = await response.json()
          await this.storeData('dashboard_stats', { id: userId, ...data })
          return data
        }
      }
      
      // Fallback to cached data
      const cachedData = await this.getData('dashboard_stats', userId)
      if (cachedData) {
        console.log('📱 Using cached dashboard data')
        return cachedData
      }
      
      // Return default offline data
      return this.getDefaultOfflineData()
    } catch (error) {
      console.error('Error getting dashboard data:', error)
      return this.getDefaultOfflineData()
    }
  }

  /**
   * Get default data for offline mode
   */
  getDefaultOfflineData() {
    return {
      message: 'Offline Mode',
      stats: {
        total_students: 'N/A',
        total_classes: 'N/A',
        attendance_rate: 'N/A',
        average_grade: 'N/A'
      },
      recent_activities: [
        {
          id: 'offline-1',
          message: 'You are currently offline. Some features may be limited.',
          type: 'info',
          timestamp: new Date().toISOString()
        }
      ],
      offline: true
    }
  }

  /**
   * Clear all offline data (for logout)
   */
  async clearOfflineData() {
    if (!this.db) return
    
    const storeNames = ['users', 'students', 'grades', 'attendance', 'dashboard_stats', 'gamification']
    
    for (const storeName of storeNames) {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      await store.clear()
    }
    
    console.log('🗑️ Offline data cleared')
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { quota: 'Unknown', usage: 'Unknown' }
    }
    
    const estimate = await navigator.storage.estimate()
    return {
      quota: this.formatBytes(estimate.quota),
      usage: this.formatBytes(estimate.usage),
      available: this.formatBytes(estimate.quota - estimate.usage)
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Create global instance
const offlineStorage = new OfflineStorageManager()

export default offlineStorage
export { OfflineStorageManager }
