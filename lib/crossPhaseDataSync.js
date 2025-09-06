/**
 * Cross-Phase Data Synchronization System
 * Manages real-time data synchronization between all 5 phases
 * Ensures data consistency and integrity across the entire system
 */

export class CrossPhaseDataSync {
  constructor() {
    this.syncQueue = []
    this.syncInProgress = false
    this.syncInterval = null
    this.dataValidators = new Map()
    this.syncListeners = new Map()
    this.conflictResolvers = new Map()
    this.lastSyncTimestamp = new Map()
    
    this.initializeValidators()
    this.initializeConflictResolvers()
    this.startSyncScheduler()
  }

  /**
   * Initialize data validators for each phase
   */
  initializeValidators() {
    // Phase 1: Gamification & Analytics
    this.dataValidators.set('PHASE_1', {
      gamification: (data) => {
        return data.points >= 0 && 
               data.level >= 1 && 
               Array.isArray(data.achievements) &&
               typeof data.streaks === 'object'
      },
      analytics: (data) => {
        return Array.isArray(data.performance_trends) &&
               typeof data.subject_performance === 'object' &&
               data.risk_score >= 0 && data.risk_score <= 100
      }
    })

    // Phase 2: AI-Powered Features
    this.dataValidators.set('PHASE_2', {
      ai_insights: (data) => {
        return Array.isArray(data.recommendations) &&
               typeof data.learning_style === 'string' &&
               data.confidence_score >= 0 && data.confidence_score <= 1
      },
      personalized_paths: (data) => {
        return typeof data.current_path === 'string' &&
               data.progress >= 0 && data.progress <= 100 &&
               Array.isArray(data.milestones)
      }
    })

    // Phase 3: Communication & Collaboration
    this.dataValidators.set('PHASE_3', {
      communication: (data) => {
        return typeof data.unread_count === 'number' &&
               Array.isArray(data.active_conversations) &&
               typeof data.online_status === 'boolean'
      },
      collaboration: (data) => {
        return Array.isArray(data.active_projects) &&
               Array.isArray(data.team_memberships) &&
               typeof data.collaboration_score === 'number'
      }
    })

    // Phase 4: Wellbeing & Accessibility
    this.dataValidators.set('PHASE_4', {
      wellbeing: (data) => {
        return data.wellbeing_score >= 0 && data.wellbeing_score <= 100 &&
               ['LOW', 'MEDIUM', 'HIGH'].includes(data.risk_level) &&
               Array.isArray(data.support_plans)
      },
      accessibility: (data) => {
        return Array.isArray(data.accommodations) &&
               typeof data.preferences === 'object' &&
               typeof data.assistive_tech === 'object'
      }
    })

    // Phase 5: Advanced Assessment & Innovation
    this.dataValidators.set('PHASE_5', {
      assessment: (data) => {
        return Array.isArray(data.portfolio_items) &&
               Array.isArray(data.competency_assessments) &&
               typeof data.blockchain_verified === 'boolean'
      },
      innovation: (data) => {
        return Array.isArray(data.lab_projects) &&
               typeof data.technology_access === 'object' &&
               Array.isArray(data.innovation_challenges)
      }
    })
  }

  /**
   * Initialize conflict resolution strategies
   */
  initializeConflictResolvers() {
    // Timestamp-based resolution (latest wins)
    this.conflictResolvers.set('timestamp', (local, remote) => {
      return new Date(remote.timestamp) > new Date(local.timestamp) ? remote : local
    })

    // Score-based resolution (higher score wins)
    this.conflictResolvers.set('score', (local, remote) => {
      return (remote.score || 0) > (local.score || 0) ? remote : local
    })

    // Merge strategy (combine non-conflicting fields)
    this.conflictResolvers.set('merge', (local, remote) => {
      return { ...local, ...remote, timestamp: new Date().toISOString() }
    })

    // User preference (always prefer user-initiated changes)
    this.conflictResolvers.set('user_preference', (local, remote) => {
      return remote.user_initiated ? remote : local
    })
  }

  /**
   * Start the automatic sync scheduler
   */
  startSyncScheduler() {
    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.processSyncQueue()
    }, 30000)
  }

  /**
   * Stop the sync scheduler
   */
  stopSyncScheduler() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Queue data for synchronization
   */
  queueSync(userId, phase, dataType, data, priority = 'normal') {
    const syncItem = {
      id: this.generateSyncId(),
      userId,
      phase,
      dataType,
      data: { ...data, timestamp: new Date().toISOString() },
      priority,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date()
    }

    // Validate data before queuing
    if (!this.validateData(phase, dataType, data)) {
      console.error(`Invalid data for ${phase}:${dataType}`, data)
      return false
    }

    // Add to queue based on priority
    if (priority === 'high') {
      this.syncQueue.unshift(syncItem)
    } else {
      this.syncQueue.push(syncItem)
    }

    // Trigger immediate sync for high priority items
    if (priority === 'high' && !this.syncInProgress) {
      this.processSyncQueue()
    }

    return syncItem.id
  }

  /**
   * Process the sync queue
   */
  async processSyncQueue() {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return
    }

    this.syncInProgress = true

    try {
      while (this.syncQueue.length > 0) {
        const syncItem = this.syncQueue.shift()
        await this.processSyncItem(syncItem)
      }
    } catch (error) {
      console.error('Sync queue processing error:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Process individual sync item
   */
  async processSyncItem(syncItem) {
    try {
      // Check for conflicts
      const conflicts = await this.detectConflicts(syncItem)
      
      if (conflicts.length > 0) {
        syncItem.data = await this.resolveConflicts(syncItem, conflicts)
      }

      // Perform the actual sync
      await this.performSync(syncItem)
      
      // Update cross-phase dependencies
      await this.updateCrossPhaseData(syncItem)
      
      // Notify listeners
      this.notifyListeners(syncItem)
      
      // Update last sync timestamp
      this.lastSyncTimestamp.set(`${syncItem.userId}:${syncItem.phase}:${syncItem.dataType}`, new Date())
      
    } catch (error) {
      console.error(`Sync failed for item ${syncItem.id}:`, error)
      
      // Retry logic
      syncItem.attempts++
      if (syncItem.attempts < syncItem.maxAttempts) {
        // Re-queue with exponential backoff
        setTimeout(() => {
          this.syncQueue.push(syncItem)
        }, Math.pow(2, syncItem.attempts) * 1000)
      }
    }
  }

  /**
   * Detect data conflicts
   */
  async detectConflicts(syncItem) {
    const conflicts = []
    
    // Simulate conflict detection
    const existingData = await this.getExistingData(syncItem.userId, syncItem.phase, syncItem.dataType)
    
    if (existingData && existingData.timestamp) {
      const existingTime = new Date(existingData.timestamp)
      const newTime = new Date(syncItem.data.timestamp)
      
      // Check for concurrent modifications
      if (Math.abs(newTime - existingTime) < 5000) { // 5 second window
        conflicts.push({
          type: 'concurrent_modification',
          existing: existingData,
          incoming: syncItem.data
        })
      }
    }
    
    return conflicts
  }

  /**
   * Resolve data conflicts
   */
  async resolveConflicts(syncItem, conflicts) {
    let resolvedData = syncItem.data
    
    for (const conflict of conflicts) {
      const strategy = this.getConflictStrategy(syncItem.phase, syncItem.dataType)
      const resolver = this.conflictResolvers.get(strategy)
      
      if (resolver) {
        resolvedData = resolver(conflict.existing, conflict.incoming)
      }
    }
    
    return resolvedData
  }

  /**
   * Get conflict resolution strategy for data type
   */
  getConflictStrategy(phase, dataType) {
    const strategies = {
      'PHASE_1': {
        'gamification': 'score',
        'analytics': 'timestamp'
      },
      'PHASE_2': {
        'ai_insights': 'timestamp',
        'personalized_paths': 'merge'
      },
      'PHASE_3': {
        'communication': 'timestamp',
        'collaboration': 'user_preference'
      },
      'PHASE_4': {
        'wellbeing': 'timestamp',
        'accessibility': 'user_preference'
      },
      'PHASE_5': {
        'assessment': 'timestamp',
        'innovation': 'merge'
      }
    }
    
    return strategies[phase]?.[dataType] || 'timestamp'
  }

  /**
   * Perform the actual data synchronization
   */
  async performSync(syncItem) {
    // Simulate API call to sync data
    console.log(`Syncing ${syncItem.phase}:${syncItem.dataType} for user ${syncItem.userId}`)
    
    // In a real implementation, this would make API calls to update the backend
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return true
  }

  /**
   * Update cross-phase dependencies
   */
  async updateCrossPhaseData(syncItem) {
    const { userId, phase, dataType, data } = syncItem
    
    // Define cross-phase update rules
    const crossPhaseRules = {
      'PHASE_1:gamification': {
        'PHASE_4:wellbeing': (gamificationData) => ({
          motivation_score: Math.min(100, gamificationData.points / 10),
          engagement_level: gamificationData.level > 5 ? 'HIGH' : 'MEDIUM'
        })
      },
      'PHASE_4:wellbeing': {
        'PHASE_1:gamification': (wellbeingData) => ({
          wellbeing_bonus: wellbeingData.wellbeing_score > 80 ? 50 : 0,
          support_achievements: wellbeingData.risk_level === 'LOW' ? ['Wellbeing Champion'] : []
        })
      },
      'PHASE_2:ai_insights': {
        'PHASE_5:assessment': (aiData) => ({
          recommended_assessments: aiData.recommendations.filter(r => r.type === 'assessment'),
          learning_style_adaptations: aiData.learning_style
        })
      }
    }
    
    const ruleKey = `${phase}:${dataType}`
    const rules = crossPhaseRules[ruleKey]
    
    if (rules) {
      for (const [targetPhaseData, updateFunction] of Object.entries(rules)) {
        const [targetPhase, targetDataType] = targetPhaseData.split(':')
        const updateData = updateFunction(data)
        
        // Queue update for target phase
        this.queueSync(userId, targetPhase, targetDataType, updateData, 'normal')
      }
    }
  }

  /**
   * Validate data against phase-specific rules
   */
  validateData(phase, dataType, data) {
    const phaseValidators = this.dataValidators.get(phase)
    if (!phaseValidators) return true
    
    const validator = phaseValidators[dataType]
    if (!validator) return true
    
    return validator(data)
  }

  /**
   * Get existing data for conflict detection
   */
  async getExistingData(userId, phase, dataType) {
    // Simulate fetching existing data
    // In a real implementation, this would query the backend
    return null
  }

  /**
   * Register sync listener
   */
  addSyncListener(phase, dataType, callback) {
    const key = `${phase}:${dataType}`
    if (!this.syncListeners.has(key)) {
      this.syncListeners.set(key, [])
    }
    this.syncListeners.get(key).push(callback)
  }

  /**
   * Remove sync listener
   */
  removeSyncListener(phase, dataType, callback) {
    const key = `${phase}:${dataType}`
    const listeners = this.syncListeners.get(key)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify registered listeners
   */
  notifyListeners(syncItem) {
    const key = `${syncItem.phase}:${syncItem.dataType}`
    const listeners = this.syncListeners.get(key) || []
    
    listeners.forEach(callback => {
      try {
        callback(syncItem)
      } catch (error) {
        console.error('Sync listener error:', error)
      }
    })
  }

  /**
   * Generate unique sync ID
   */
  generateSyncId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      queueLength: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
      lastSyncTimes: Object.fromEntries(this.lastSyncTimestamp),
      totalListeners: Array.from(this.syncListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0)
    }
  }

  /**
   * Force sync for specific user and phase
   */
  async forceSyncUser(userId, phase = null) {
    const phases = phase ? [phase] : ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4', 'PHASE_5']
    
    for (const p of phases) {
      // Queue high-priority sync for all data types in the phase
      const dataTypes = Object.keys(this.dataValidators.get(p) || {})
      for (const dataType of dataTypes) {
        this.queueSync(userId, p, dataType, { force_sync: true }, 'high')
      }
    }
    
    // Process immediately
    await this.processSyncQueue()
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopSyncScheduler()
    this.syncQueue = []
    this.syncListeners.clear()
    this.lastSyncTimestamp.clear()
  }
}

// Export singleton instance
export const crossPhaseDataSync = new CrossPhaseDataSync()
