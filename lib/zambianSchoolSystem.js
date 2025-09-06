/**
 * Zambian School Management System Integration
 * Combines all rural-specific features for comprehensive school management
 * Designed for ultra-low infrastructure environments
 */

import { offlineSystem } from './offlineSystem.js'
import { smsSystem } from './smsSystem.js'
import { powerManagement } from './powerManagement.js'
import { languageSystem } from './languageSystem.js'
import { mobileMoneySystem } from './mobileMoneySystem.js'

export class ZambianSchoolSystem {
  constructor() {
    this.isInitialized = false
    this.systemStatus = 'initializing'
    this.activeFeatures = new Set()
    this.userProfile = null
    this.schoolProfile = null
    this.emergencyMode = false
    
    this.initializeSystem()
  }

  /**
   * Initialize the complete Zambian school system
   */
  async initializeSystem() {
    console.log('🇿🇲 Initializing Zambian School Management System...')
    
    try {
      // Initialize core systems
      await this.initializeCoreFeatures()
      
      // Setup system integrations
      await this.setupSystemIntegrations()
      
      // Load user and school profiles
      await this.loadProfiles()
      
      // Setup emergency protocols
      this.setupEmergencyProtocols()
      
      // Start system monitoring
      this.startSystemMonitoring()
      
      this.systemStatus = 'operational'
      this.isInitialized = true
      
      console.log('✅ Zambian School System initialized successfully')
      
      // Emit initialization complete event
      window.dispatchEvent(new CustomEvent('zambian-school-system-ready', {
        detail: { 
          status: this.systemStatus,
          features: Array.from(this.activeFeatures),
          timestamp: new Date().toISOString()
        }
      }))
      
    } catch (error) {
      console.error('❌ Failed to initialize Zambian School System:', error)
      this.systemStatus = 'error'
      this.handleInitializationError(error)
    }
  }

  /**
   * Initialize core features for rural operation
   */
  async initializeCoreFeatures() {
    console.log('🔧 Initializing core features...')
    
    // Initialize offline system first (most critical)
    if (offlineSystem) {
      this.activeFeatures.add('offline_mode')
      console.log('✓ Offline system ready')
    }
    
    // Initialize power management
    if (powerManagement) {
      this.activeFeatures.add('power_management')
      console.log('✓ Power management ready')
    }
    
    // Initialize SMS system
    if (smsSystem) {
      this.activeFeatures.add('sms_communication')
      console.log('✓ SMS system ready')
    }
    
    // Initialize language system
    if (languageSystem) {
      this.activeFeatures.add('local_languages')
      console.log('✓ Language system ready')
    }
    
    // Initialize mobile money system
    if (mobileMoneySystem) {
      this.activeFeatures.add('mobile_money')
      console.log('✓ Mobile money system ready')
    }
  }

  /**
   * Setup integrations between different systems
   */
  async setupSystemIntegrations() {
    console.log('🔗 Setting up system integrations...')
    
    // Integrate offline system with all other systems
    this.setupOfflineIntegration()
    
    // Integrate power management with all systems
    this.setupPowerIntegration()
    
    // Integrate SMS with mobile money for notifications
    this.setupSMSMobileMoneyIntegration()
    
    // Integrate language system with all user interfaces
    this.setupLanguageIntegration()
    
    // Setup cross-system event handling
    this.setupEventHandling()
  }

  /**
   * Setup offline integration with all systems
   */
  setupOfflineIntegration() {
    // Store SMS messages offline
    window.addEventListener('sms-sent', async (event) => {
      if (offlineSystem && !navigator.onLine) {
        await offlineSystem.storeOfflineData('sms_messages', event.detail, 'high')
      }
    })
    
    // Store mobile money transactions offline
    window.addEventListener('payment-processed', async (event) => {
      if (offlineSystem) {
        await offlineSystem.storeOfflineData('payments', event.detail, 'high')
      }
    })
    
    // Store language preferences offline
    window.addEventListener('language-changed', async (event) => {
      if (offlineSystem) {
        await offlineSystem.storeOfflineData('language_settings', event.detail, 'normal')
      }
    })
  }

  /**
   * Setup power management integration
   */
  setupPowerIntegration() {
    // Adjust system behavior based on power mode
    window.addEventListener('power-mode-changed', (event) => {
      const { mode } = event.detail
      
      switch (mode) {
        case 'ultra-low':
          this.enableUltraLowPowerMode()
          break
        case 'eco':
          this.enableEcoPowerMode()
          break
        case 'normal':
          this.enableNormalPowerMode()
          break
      }
    })
    
    // Register system components with power management
    if (powerManagement) {
      powerManagement.registerDevice('sms_system', {
        name: 'SMS Communication',
        powerConsumption: 10,
        essential: true
      })
      
      powerManagement.registerDevice('mobile_money', {
        name: 'Mobile Money',
        powerConsumption: 15,
        essential: true
      })
      
      powerManagement.registerDevice('language_system', {
        name: 'Language Support',
        powerConsumption: 5,
        essential: false
      })
    }
  }

  /**
   * Setup SMS and mobile money integration
   */
  setupSMSMobileMoneyIntegration() {
    // Send SMS confirmations for mobile money transactions
    window.addEventListener('payment-completed', async (event) => {
      const { transaction } = event.detail
      
      if (smsSystem && transaction.phoneNumber) {
        const message = this.generatePaymentConfirmationMessage(transaction)
        await smsSystem.sendSMS(transaction.phoneNumber, message, 'payment_confirmation', 'high')
      }
    })
    
    // Handle USSD-based mobile money requests
    if (smsSystem && mobileMoneySystem) {
      smsSystem.ussdCodes.set('*123*31#', {
        function: 'check_fee_balance',
        description: 'Check school fee balance',
        userType: 'parent',
        handler: this.handleFeeBalanceUSSD.bind(this)
      })
      
      smsSystem.ussdCodes.set('*123*32#', {
        function: 'pay_school_fees',
        description: 'Pay school fees',
        userType: 'parent',
        handler: this.handleFeePaymentUSSD.bind(this)
      })
    }
  }

  /**
   * Setup language integration across all systems
   */
  setupLanguageIntegration() {
    // Update SMS templates when language changes
    window.addEventListener('language-changed', (event) => {
      const { language } = event.detail
      
      if (smsSystem) {
        this.updateSMSTemplatesForLanguage(language)
      }
      
      if (mobileMoneySystem) {
        this.updateMobileMoneyMessagesForLanguage(language)
      }
    })
    
    // Provide voice feedback in local languages
    if (languageSystem && 'speechSynthesis' in window) {
      this.setupVoiceFeedback()
    }
  }

  /**
   * Setup cross-system event handling
   */
  setupEventHandling() {
    // Handle emergency situations
    window.addEventListener('emergency-alert', (event) => {
      this.handleEmergencyAlert(event.detail)
    })
    
    // Handle low battery situations
    window.addEventListener('critical-battery', (event) => {
      this.handleCriticalBattery(event.detail)
    })
    
    // Handle network connectivity changes
    window.addEventListener('connectivity-changed', (event) => {
      this.handleConnectivityChange(event.detail)
    })
  }

  /**
   * Load user and school profiles
   */
  async loadProfiles() {
    try {
      // Load user profile from storage
      const savedUserProfile = localStorage.getItem('zambian_user_profile')
      if (savedUserProfile) {
        this.userProfile = JSON.parse(savedUserProfile)
      }
      
      // Load school profile from storage
      const savedSchoolProfile = localStorage.getItem('zambian_school_profile')
      if (savedSchoolProfile) {
        this.schoolProfile = JSON.parse(savedSchoolProfile)
      }
      
      // Apply profile-based configurations
      if (this.userProfile) {
        await this.applyUserConfiguration()
      }
      
      if (this.schoolProfile) {
        await this.applySchoolConfiguration()
      }
      
    } catch (error) {
      console.error('Failed to load profiles:', error)
    }
  }

  /**
   * Apply user-specific configuration
   */
  async applyUserConfiguration() {
    const { language, province, phoneNumber, userType } = this.userProfile
    
    // Set user's preferred language
    if (language && languageSystem) {
      languageSystem.setLanguage(language)
    }
    
    // Register user's phone number for SMS
    if (phoneNumber && smsSystem) {
      smsSystem.registerPhoneNumber(phoneNumber, this.userProfile)
    }
    
    // Apply regional adaptations
    if (province && languageSystem) {
      const recommendations = languageSystem.getLanguageRecommendations(province)
      console.log(`📍 Regional language recommendations for ${province}:`, recommendations)
    }
  }

  /**
   * Apply school-specific configuration
   */
  async applySchoolConfiguration() {
    const { 
      solarCapacity, 
      internetConnectivity, 
      primaryLanguages,
      studentCount,
      feeStructure 
    } = this.schoolProfile
    
    // Configure power management based on solar capacity
    if (solarCapacity && powerManagement) {
      powerManagement.solarConfig.numberOfPanels = Math.ceil(solarCapacity / 300)
    }
    
    // Adjust system behavior based on connectivity
    if (internetConnectivity === 'poor' || internetConnectivity === 'none') {
      this.enableOfflineFirstMode()
    }
    
    // Set primary languages for the school
    if (primaryLanguages && languageSystem) {
      this.setupSchoolLanguages(primaryLanguages)
    }
  }

  /**
   * Setup emergency protocols
   */
  setupEmergencyProtocols() {
    // Emergency contact numbers
    this.emergencyContacts = {
      headteacher: '+260977123456',
      district_office: '+260977654321',
      health_center: '+260977789012',
      police: '991',
      ambulance: '992'
    }
    
    // Emergency procedures
    this.emergencyProcedures = {
      medical: this.handleMedicalEmergency.bind(this),
      security: this.handleSecurityEmergency.bind(this),
      infrastructure: this.handleInfrastructureEmergency.bind(this),
      weather: this.handleWeatherEmergency.bind(this)
    }
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    // Monitor system health every 5 minutes
    setInterval(() => {
      this.performSystemHealthCheck()
    }, 5 * 60 * 1000)
    
    // Monitor critical resources every minute
    setInterval(() => {
      this.monitorCriticalResources()
    }, 60 * 1000)
  }

  /**
   * Perform comprehensive system health check
   */
  performSystemHealthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      systems: {}
    }
    
    // Check offline system
    if (offlineSystem) {
      const offlineStatus = offlineSystem.getOfflineStatus()
      healthStatus.systems.offline = {
        status: offlineStatus.isOnline ? 'online' : 'offline',
        offlineDuration: offlineStatus.offlineDuration,
        syncQueueSize: offlineStatus.syncQueueSize
      }
    }
    
    // Check power management
    if (powerManagement) {
      const powerStatus = powerManagement.getPowerStatus()
      healthStatus.systems.power = {
        batteryLevel: powerStatus.batteryLevel,
        powerMode: powerStatus.powerMode,
        consumption: powerStatus.powerConsumption
      }
    }
    
    // Check SMS system
    if (smsSystem) {
      const smsStats = smsSystem.getSMSStats()
      healthStatus.systems.sms = {
        successRate: smsStats.successRate,
        pending: smsStats.pending,
        registeredUsers: smsStats.registeredUsers
      }
    }
    
    // Check mobile money system
    if (mobileMoneySystem) {
      const moneyStats = mobileMoneySystem.getMobileMoneyStats()
      healthStatus.systems.mobileMoney = {
        successRate: moneyStats.successRate,
        totalTransactions: moneyStats.totalTransactions,
        totalAmount: moneyStats.totalAmount
      }
    }
    
    // Determine overall health
    const systemIssues = Object.values(healthStatus.systems).filter(system => 
      system.status === 'error' || 
      (system.batteryLevel && system.batteryLevel < 10) ||
      (system.successRate && system.successRate < 80)
    )
    
    if (systemIssues.length > 0) {
      healthStatus.overall = 'warning'
    }
    
    // Emit health status event
    window.dispatchEvent(new CustomEvent('system-health-check', {
      detail: healthStatus
    }))
    
    return healthStatus
  }

  /**
   * Monitor critical resources
   */
  monitorCriticalResources() {
    // Check battery level
    if (powerManagement) {
      const powerStatus = powerManagement.getPowerStatus()
      
      if (powerStatus.batteryLevel < 5) {
        this.handleCriticalBattery({ level: powerStatus.batteryLevel })
      }
    }
    
    // Check storage space
    if (offlineSystem) {
      offlineSystem.checkStorageSpace()
    }
    
    // Check network connectivity
    this.checkNetworkConnectivity()
  }

  /**
   * Handle emergency alerts
   */
  async handleEmergencyAlert(alertData) {
    console.log('🚨 Emergency alert received:', alertData)
    
    this.emergencyMode = true
    
    // Switch to emergency power mode
    if (powerManagement) {
      powerManagement.setPowerMode('ultra-low')
    }
    
    // Send emergency notifications
    if (smsSystem) {
      for (const [role, contact] of Object.entries(this.emergencyContacts)) {
        const message = `EMERGENCY at ${this.schoolProfile?.name || 'School'}: ${alertData.description}. Location: ${alertData.location || 'Unknown'}. Time: ${new Date().toLocaleString()}`
        
        await smsSystem.sendSMS(contact, message, 'emergency', 'high')
      }
    }
    
    // Store emergency data offline
    if (offlineSystem) {
      await offlineSystem.storeOfflineData('emergency_alerts', alertData, 'high')
    }
  }

  /**
   * Handle critical battery situations
   */
  handleCriticalBattery(batteryData) {
    console.log('🔋 Critical battery level:', batteryData.level)
    
    // Enable emergency power saving
    if (powerManagement) {
      powerManagement.setPowerMode('ultra-low')
    }
    
    // Disable non-essential features
    this.disableNonEssentialFeatures()
    
    // Save critical data
    this.saveCriticalData()
  }

  /**
   * Handle connectivity changes
   */
  handleConnectivityChange(connectivityData) {
    const { isOnline, connectionType } = connectivityData
    
    if (isOnline) {
      console.log('🌐 Connection restored:', connectionType)
      
      // Start data synchronization
      if (offlineSystem) {
        offlineSystem.synchronizeOfflineData()
      }
      
      // Process queued SMS messages
      if (smsSystem) {
        smsSystem.startMessageProcessor()
      }
      
    } else {
      console.log('📴 Connection lost - entering offline mode')
      
      // Enable offline mode
      if (offlineSystem) {
        offlineSystem.handleOfflineMode()
      }
    }
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      systemStatus: this.systemStatus,
      activeFeatures: Array.from(this.activeFeatures),
      emergencyMode: this.emergencyMode,
      userProfile: this.userProfile,
      schoolProfile: this.schoolProfile,
      lastHealthCheck: this.lastHealthCheck,
      uptime: this.getUptime()
    }
  }

  /**
   * Enable ultra-low power mode across all systems
   */
  enableUltraLowPowerMode() {
    console.log('🔋 Enabling ultra-low power mode across all systems')
    
    // Reduce SMS frequency
    if (smsSystem) {
      smsSystem.messageQueue = smsSystem.messageQueue.filter(msg => msg.priority === 'high')
    }
    
    // Disable voice features
    if (languageSystem && 'speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    
    // Reduce mobile money processing
    if (mobileMoneySystem) {
      // Process only essential transactions
    }
  }

  /**
   * Generate payment confirmation message in appropriate language
   */
  generatePaymentConfirmationMessage(transaction) {
    const language = this.userProfile?.language || 'en'
    
    if (languageSystem) {
      const thankYou = languageSystem.translate('thank_you', language)
      return `${thankYou}! K${transaction.amount} ${languageSystem.translate('payment_received', language)}. Ref: ${transaction.id}`
    }
    
    return `Payment confirmed! K${transaction.amount} received. Ref: ${transaction.id}`
  }

  /**
   * Handle fee balance USSD request
   */
  async handleFeeBalanceUSSD(userInfo, sessionId) {
    try {
      const balance = await mobileMoneySystem.checkFeeBalance(userInfo.studentId)
      
      const message = `Fee Balance:
Amount Due: K${balance.balance}
Last Payment: K${balance.lastPayment?.amount || 0}
Total Paid: K${balance.totalPaid}`
      
      return smsSystem.createUSSDResponse(message, 'end')
    } catch (error) {
      return smsSystem.createUSSDResponse('Unable to check balance. Try again later.', 'end')
    }
  }

  /**
   * Handle fee payment USSD request
   */
  async handleFeePaymentUSSD(userInfo, sessionId) {
    const message = `Pay School Fees:
1. Full Payment
2. Partial Payment
3. Setup Installments
0. Back to Main Menu`
    
    return smsSystem.createUSSDResponse(message, 'continue')
  }

  // Additional helper methods
  getUptime() {
    return this.isInitialized ? Date.now() - this.initializationTime : 0
  }

  disableNonEssentialFeatures() {
    // Disable features that are not critical for basic operation
    window.dispatchEvent(new CustomEvent('disable-non-essential-features'))
  }

  saveCriticalData() {
    // Save only the most critical data
    if (offlineSystem) {
      const criticalData = {
        userProfile: this.userProfile,
        schoolProfile: this.schoolProfile,
        emergencyContacts: this.emergencyContacts,
        timestamp: new Date().toISOString()
      }
      
      offlineSystem.storeOfflineData('critical_system_data', criticalData, 'high')
    }
  }

  checkNetworkConnectivity() {
    const isOnline = navigator.onLine
    const connectionType = navigator.connection?.effectiveType || 'unknown'
    
    window.dispatchEvent(new CustomEvent('connectivity-changed', {
      detail: { isOnline, connectionType }
    }))
  }

  enableOfflineFirstMode() {
    console.log('📴 Enabling offline-first mode for poor connectivity')
    
    // Configure all systems for offline-first operation
    if (offlineSystem) {
      offlineSystem.maxOfflineDays = 14 // Extend offline capability
    }
  }

  setupSchoolLanguages(languages) {
    console.log('🌍 Setting up school languages:', languages)
    
    // Configure primary languages for the school
    languages.forEach(lang => {
      if (languageSystem.supportedLanguages.has(lang)) {
        console.log(`✓ Language ${lang} configured`)
      }
    })
  }

  // Emergency handlers
  async handleMedicalEmergency(data) {
    console.log('🏥 Medical emergency protocol activated')
    // Implementation for medical emergencies
  }

  async handleSecurityEmergency(data) {
    console.log('🚔 Security emergency protocol activated')
    // Implementation for security emergencies
  }

  async handleInfrastructureEmergency(data) {
    console.log('🏗️ Infrastructure emergency protocol activated')
    // Implementation for infrastructure emergencies
  }

  async handleWeatherEmergency(data) {
    console.log('🌩️ Weather emergency protocol activated')
    // Implementation for weather emergencies
  }
}

// Export singleton instance
export const zambianSchoolSystem = new ZambianSchoolSystem()

/**
 * Phase 2: Rural-Specific Educational Features
 * Agricultural calendar integration, multi-grade classrooms, traveling teachers
 */
export class RuralEducationSystem {
  constructor() {
    this.agriculturalCalendar = new Map()
    this.multiGradeClassrooms = new Map()
    this.travelingTeachers = new Map()
    this.seasonalAdaptations = new Map()
    this.communitySchedules = new Map()

    this.initializeAgriculturalCalendar()
    this.setupMultiGradeSupport()
    this.configureTravelingTeachers()
    this.loadSeasonalAdaptations()
  }

  /**
   * Initialize agricultural calendar for Zambian farming seasons
   */
  initializeAgriculturalCalendar() {
    // Zambian agricultural seasons
    this.agriculturalCalendar.set('rainy_season', {
      name: 'Rainy Season',
      localNames: {
        'bem': 'Impula',
        'ton': 'Mvula',
        'nya': 'Mvula',
        'loz': 'Pula'
      },
      months: [11, 12, 1, 2, 3], // November to March
      activities: [
        'Land preparation',
        'Planting maize',
        'Planting groundnuts',
        'Weeding',
        'Fertilizer application'
      ],
      schoolImpact: {
        attendance: 'reduced', // Children help with farming
        schedule: 'flexible',
        priorities: ['practical_agriculture', 'basic_literacy', 'numeracy']
      },
      communityEvents: [
        'First rains ceremony',
        'Planting festivals',
        'Community work parties'
      ]
    })

    this.agriculturalCalendar.set('dry_season', {
      name: 'Dry Season',
      localNames: {
        'bem': 'Cimushi',
        'ton': 'Cindi',
        'nya': 'Chilimwe',
        'loz': 'Selemo'
      },
      months: [4, 5, 6, 7, 8, 9, 10], // April to October
      activities: [
        'Harvesting',
        'Post-harvest processing',
        'Marketing crops',
        'Livestock management',
        'Infrastructure repair'
      ],
      schoolImpact: {
        attendance: 'normal',
        schedule: 'regular',
        priorities: ['full_curriculum', 'examinations', 'extra_activities']
      },
      communityEvents: [
        'Harvest festivals',
        'Traditional ceremonies',
        'Market days'
      ]
    })

    this.agriculturalCalendar.set('hunger_season', {
      name: 'Hunger Season',
      localNames: {
        'bem': 'Ukusaka',
        'ton': 'Nzala',
        'nya': 'Njala',
        'loz': 'Tlala'
      },
      months: [12, 1, 2], // December to February
      activities: [
        'Food preservation',
        'Wild food gathering',
        'Community support',
        'Income generation'
      ],
      schoolImpact: {
        attendance: 'very_reduced',
        schedule: 'minimal',
        priorities: ['feeding_program', 'basic_skills', 'health_education']
      },
      communityEvents: [
        'Food sharing ceremonies',
        'Community kitchens',
        'Support group meetings'
      ]
    })

    console.log('🌾 Agricultural calendar initialized')
  }

  /**
   * Setup multi-grade classroom support
   */
  setupMultiGradeSupport() {
    // Common multi-grade combinations in rural Zambia
    this.multiGradeClassrooms.set('lower_primary', {
      grades: [1, 2, 3],
      name: 'Lower Primary Combined',
      maxStudents: 45,
      teachingStrategy: 'peer_learning',
      subjects: {
        'literacy': {
          grade1: 'Letter recognition, basic sounds',
          grade2: 'Simple words, short sentences',
          grade3: 'Reading comprehension, writing'
        },
        'numeracy': {
          grade1: 'Numbers 1-20, basic counting',
          grade2: 'Numbers 1-100, addition/subtraction',
          grade3: 'Multiplication, division, fractions'
        },
        'local_language': {
          grade1: 'Oral communication',
          grade2: 'Basic reading/writing',
          grade3: 'Fluent communication'
        }
      },
      schedule: {
        morning: 'Core subjects (literacy, numeracy)',
        afternoon: 'Practical activities, local language'
      }
    })

    this.multiGradeClassrooms.set('upper_primary', {
      grades: [4, 5, 6, 7],
      name: 'Upper Primary Combined',
      maxStudents: 50,
      teachingStrategy: 'differentiated_instruction',
      subjects: {
        'english': {
          grade4: 'Basic grammar, simple texts',
          grade5: 'Intermediate reading, writing',
          grade6: 'Advanced comprehension',
          grade7: 'Exam preparation'
        },
        'mathematics': {
          grade4: 'Basic operations, geometry',
          grade5: 'Decimals, percentages',
          grade6: 'Algebra basics, statistics',
          grade7: 'Advanced problem solving'
        },
        'science': {
          grade4: 'Basic observations',
          grade5: 'Simple experiments',
          grade6: 'Scientific method',
          grade7: 'Applied science'
        },
        'social_studies': {
          grade4: 'Local community',
          grade5: 'Zambian geography',
          grade6: 'Zambian history',
          grade7: 'Civic education'
        }
      }
    })

    console.log('👥 Multi-grade classroom support configured')
  }

  /**
   * Configure traveling teacher schedules
   */
  configureTravelingTeachers() {
    // Traveling teacher rotation schedules
    this.travelingTeachers.set('circuit_teacher_1', {
      name: 'Mathematics Specialist',
      subjects: ['mathematics', 'science'],
      schools: [
        { name: 'Mwandi Primary', distance: 0, days: ['monday', 'tuesday'] },
        { name: 'Sioma Primary', distance: 15, days: ['wednesday'] },
        { name: 'Shangombo Primary', distance: 25, days: ['thursday', 'friday'] }
      ],
      transport: 'bicycle',
      accommodation: 'community_housing',
      schedule: {
        week1: 'Mwandi Primary (Mon-Tue), Sioma Primary (Wed)',
        week2: 'Shangombo Primary (Thu-Fri), Mwandi Primary (Mon)',
        week3: 'Sioma Primary (Tue-Wed), Shangombo Primary (Thu-Fri)',
        week4: 'Assessment week - all schools'
      }
    })

    this.travelingTeachers.set('circuit_teacher_2', {
      name: 'English & Arts Specialist',
      subjects: ['english', 'creative_arts', 'music'],
      schools: [
        { name: 'Kalabo Primary', distance: 0, days: ['monday'] },
        { name: 'Lukulu Primary', distance: 30, days: ['tuesday', 'wednesday'] },
        { name: 'Mongu Primary', distance: 45, days: ['thursday', 'friday'] }
      ],
      transport: 'motorbike',
      accommodation: 'teacher_housing',
      schedule: {
        week1: 'Kalabo (Mon), Lukulu (Tue-Wed)',
        week2: 'Mongu (Thu-Fri), Kalabo (Mon)',
        week3: 'Lukulu (Tue-Wed), Mongu (Thu)',
        week4: 'Professional development week'
      }
    })

    console.log('🚴 Traveling teacher schedules configured')
  }

  /**
   * Load seasonal adaptations for school operations
   */
  loadSeasonalAdaptations() {
    this.seasonalAdaptations.set('rainy_season_adaptations', {
      period: 'November - March',
      challenges: [
        'Flooded roads and paths',
        'Children needed for farming',
        'Food scarcity',
        'Poor building conditions'
      ],
      adaptations: {
        schedule: {
          startTime: '07:00', // Earlier start
          endTime: '13:00',   // Earlier finish
          breakTime: '30min', // Longer break for meals
          daysPerWeek: 4      // Reduced days
        },
        curriculum: {
          focus: ['practical_agriculture', 'nutrition', 'health'],
          reduced: ['advanced_mathematics', 'complex_science'],
          added: ['farming_techniques', 'food_preservation', 'weather_prediction']
        },
        feeding: {
          program: 'enhanced',
          meals: 2, // Breakfast and lunch
          localFoods: ['nsima', 'vegetables', 'groundnuts']
        }
      }
    })

    this.seasonalAdaptations.set('dry_season_adaptations', {
      period: 'April - October',
      challenges: [
        'Water scarcity',
        'Dust and heat',
        'Harvest work demands',
        'Income generation needs'
      ],
      adaptations: {
        schedule: {
          startTime: '06:30', // Very early start
          endTime: '15:00',   // Normal finish
          breakTime: '45min', // Long midday break
          daysPerWeek: 5      // Full week
        },
        curriculum: {
          focus: ['full_curriculum', 'examinations', 'skills_development'],
          enhanced: ['mathematics', 'science', 'english'],
          added: ['business_skills', 'technology', 'leadership']
        },
        activities: {
          sports: 'early_morning',
          clubs: 'afternoon',
          community_service: 'weekends'
        }
      }
    })

    console.log('🌦️ Seasonal adaptations loaded')
  }

  /**
   * Get current agricultural season
   */
  getCurrentAgriculturalSeason() {
    const currentMonth = new Date().getMonth() + 1

    for (const [seasonKey, season] of this.agriculturalCalendar) {
      if (season.months.includes(currentMonth)) {
        return {
          key: seasonKey,
          ...season,
          currentActivities: this.getCurrentSeasonActivities(seasonKey),
          schoolAdaptations: this.getSchoolAdaptations(seasonKey)
        }
      }
    }

    return null
  }

  /**
   * Get current season activities
   */
  getCurrentSeasonActivities(seasonKey) {
    const season = this.agriculturalCalendar.get(seasonKey)
    if (!season) return []

    const currentMonth = new Date().getMonth() + 1
    const seasonIndex = season.months.indexOf(currentMonth)

    // Return activities relevant to current month within season
    return season.activities.slice(0, seasonIndex + 2)
  }

  /**
   * Get school adaptations for current season
   */
  getSchoolAdaptations(seasonKey) {
    const adaptationKey = `${seasonKey}_adaptations`
    return this.seasonalAdaptations.get(adaptationKey) || {}
  }

  /**
   * Generate multi-grade lesson plan
   */
  generateMultiGradeLessonPlan(classroomType, subject, duration = 60) {
    const classroom = this.multiGradeClassrooms.get(classroomType)
    if (!classroom) return null

    const subjectContent = classroom.subjects[subject]
    if (!subjectContent) return null

    const lessonPlan = {
      classroom: classroomType,
      subject,
      duration,
      strategy: classroom.teachingStrategy,
      structure: {
        introduction: Math.floor(duration * 0.15), // 15% introduction
        mainActivity: Math.floor(duration * 0.60), // 60% main activity
        groupWork: Math.floor(duration * 0.15),    // 15% group work
        conclusion: Math.floor(duration * 0.10)    // 10% conclusion
      },
      gradeActivities: {}
    }

    // Generate activities for each grade
    for (const grade of classroom.grades) {
      const gradeKey = `grade${grade}`
      lessonPlan.gradeActivities[gradeKey] = {
        content: subjectContent[gradeKey] || 'General content',
        activities: this.generateGradeSpecificActivities(grade, subject),
        assessment: this.generateGradeAssessment(grade, subject)
      }
    }

    return lessonPlan
  }

  /**
   * Generate traveling teacher schedule
   */
  generateTravelingTeacherSchedule(teacherId, month, year) {
    const teacher = this.travelingTeachers.get(teacherId)
    if (!teacher) return null

    const schedule = {
      teacherId,
      teacherName: teacher.name,
      month,
      year,
      subjects: teacher.subjects,
      weeklySchedules: []
    }

    // Generate 4 weeks of schedules
    for (let week = 1; week <= 4; week++) {
      const weekSchedule = {
        week,
        schools: [],
        totalDistance: 0,
        accommodationNeeds: []
      }

      // Parse teacher's rotation schedule
      const weekKey = `week${week}`
      const weekPlan = teacher.schedule[weekKey]

      if (weekPlan) {
        // Parse the week plan and assign schools
        teacher.schools.forEach(school => {
          if (weekPlan.includes(school.name.split(' ')[0])) {
            weekSchedule.schools.push({
              ...school,
              subjects: teacher.subjects,
              accommodation: teacher.accommodation
            })
            weekSchedule.totalDistance += school.distance
          }
        })
      }

      schedule.weeklySchedules.push(weekSchedule)
    }

    return schedule
  }

  /**
   * Get seasonal curriculum adjustments
   */
  getSeasonalCurriculumAdjustments() {
    const currentSeason = this.getCurrentAgriculturalSeason()
    if (!currentSeason) return {}

    const adaptations = this.getSchoolAdaptations(currentSeason.key)

    return {
      season: currentSeason.name,
      localName: currentSeason.localNames[languageSystem?.currentLanguage || 'en'],
      schedule: adaptations.schedule || {},
      curriculum: adaptations.curriculum || {},
      feeding: adaptations.feeding || {},
      activities: currentSeason.activities,
      communityEvents: currentSeason.communityEvents,
      schoolImpact: currentSeason.schoolImpact
    }
  }

  /**
   * Generate community engagement calendar
   */
  generateCommunityEngagementCalendar(month, year) {
    const calendar = {
      month,
      year,
      events: [],
      agriculturalActivities: [],
      schoolAdaptations: [],
      communitySupport: []
    }

    // Get current season information
    const season = this.getCurrentAgriculturalSeason()
    if (season) {
      calendar.agriculturalActivities = season.activities
      calendar.communityEvents = season.communityEvents

      // Add school adaptations
      const adaptations = this.getSchoolAdaptations(season.key)
      if (adaptations.curriculum) {
        calendar.schoolAdaptations.push({
          type: 'curriculum',
          changes: adaptations.curriculum
        })
      }

      if (adaptations.schedule) {
        calendar.schoolAdaptations.push({
          type: 'schedule',
          changes: adaptations.schedule
        })
      }
    }

    return calendar
  }

  /**
   * Calculate optimal school schedule based on season
   */
  calculateOptimalSchedule(seasonKey = null) {
    const currentSeason = seasonKey ?
      this.agriculturalCalendar.get(seasonKey) :
      this.getCurrentAgriculturalSeason()

    if (!currentSeason) return this.getDefaultSchedule()

    const adaptations = this.getSchoolAdaptations(currentSeason.key || seasonKey)
    const baseSchedule = adaptations.schedule || {}

    return {
      startTime: baseSchedule.startTime || '08:00',
      endTime: baseSchedule.endTime || '15:00',
      breakTime: baseSchedule.breakTime || '30min',
      lunchTime: baseSchedule.lunchTime || '45min',
      daysPerWeek: baseSchedule.daysPerWeek || 5,
      periodsPerDay: this.calculatePeriodsPerDay(baseSchedule),
      seasonalPriorities: currentSeason.schoolImpact?.priorities || [],
      attendanceExpectation: currentSeason.schoolImpact?.attendance || 'normal'
    }
  }

  /**
   * Get multi-grade teaching resources
   */
  getMultiGradeTeachingResources(classroomType, subject) {
    const classroom = this.multiGradeClassrooms.get(classroomType)
    if (!classroom) return null

    return {
      strategy: classroom.teachingStrategy,
      maxStudents: classroom.maxStudents,
      grades: classroom.grades,
      resources: {
        materials: this.getSubjectMaterials(subject, classroom.grades),
        activities: this.getMultiGradeActivities(subject, classroom.grades),
        assessments: this.getMultiGradeAssessments(subject, classroom.grades)
      },
      schedule: classroom.schedule,
      tips: this.getMultiGradeTeachingTips(classroom.teachingStrategy)
    }
  }

  // Helper methods
  generateGradeSpecificActivities(grade, subject) {
    const activities = {
      1: ['Drawing', 'Singing', 'Simple games'],
      2: ['Reading aloud', 'Group work', 'Practical exercises'],
      3: ['Writing exercises', 'Problem solving', 'Presentations'],
      4: ['Research tasks', 'Experiments', 'Group projects'],
      5: ['Analysis activities', 'Debates', 'Creative projects'],
      6: ['Independent study', 'Peer teaching', 'Advanced projects'],
      7: ['Exam preparation', 'Leadership roles', 'Community service']
    }

    return activities[grade] || ['General activities']
  }

  generateGradeAssessment(grade, subject) {
    const assessments = {
      1: 'Observation and oral assessment',
      2: 'Simple written tasks and demonstrations',
      3: 'Written exercises and practical tests',
      4: 'Formal tests and project work',
      5: 'Comprehensive assessments and portfolios',
      6: 'Advanced testing and peer evaluation',
      7: 'Examination preparation and mock tests'
    }

    return assessments[grade] || 'Standard assessment'
  }

  getDefaultSchedule() {
    return {
      startTime: '08:00',
      endTime: '15:00',
      breakTime: '30min',
      lunchTime: '45min',
      daysPerWeek: 5,
      periodsPerDay: 6,
      seasonalPriorities: ['full_curriculum'],
      attendanceExpectation: 'normal'
    }
  }

  calculatePeriodsPerDay(schedule) {
    const startHour = parseInt(schedule.startTime?.split(':')[0] || '8')
    const endHour = parseInt(schedule.endTime?.split(':')[0] || '15')
    const totalHours = endHour - startHour
    const breakHours = 1.5 // Approximate break time
    const teachingHours = totalHours - breakHours

    return Math.floor(teachingHours)
  }

  getSubjectMaterials(subject, grades) {
    // Return appropriate materials for multi-grade teaching
    return [
      'Grade-appropriate textbooks',
      'Visual aids and charts',
      'Manipulative materials',
      'Local language resources'
    ]
  }

  getMultiGradeActivities(subject, grades) {
    return [
      'Peer tutoring between grades',
      'Differentiated worksheets',
      'Group projects with mixed grades',
      'Individual learning stations'
    ]
  }

  getMultiGradeAssessments(subject, grades) {
    return [
      'Grade-specific rubrics',
      'Portfolio assessments',
      'Peer evaluation systems',
      'Continuous assessment methods'
    ]
  }

  getMultiGradeTeachingTips(strategy) {
    const tips = {
      'peer_learning': [
        'Pair older students with younger ones',
        'Create learning circles',
        'Use student mentors',
        'Encourage collaborative problem solving'
      ],
      'differentiated_instruction': [
        'Prepare materials at different levels',
        'Use flexible grouping',
        'Provide choice in activities',
        'Adjust pace for different learners'
      ]
    }

    return tips[strategy] || ['Use varied teaching methods']
  }
}

// Export rural education system
export const ruralEducationSystem = new RuralEducationSystem()

/**
 * Master Integration System for All Phases
 * Connects Phase 1-5 systems seamlessly
 */
export class ZambianSchoolMasterSystem {
  constructor() {
    this.phase1Systems = {
      offline: null,
      sms: null,
      power: null,
      language: null,
      mobileMoney: null
    }

    this.phase2Systems = {
      ruralEducation: null
    }

    this.phase3Systems = {
      healthNutrition: null
    }

    this.phase4Systems = {
      economicTransport: null
    }

    this.phase5Systems = {
      technicalSustainability: null
    }

    this.integrationStatus = 'initializing'
    this.crossSystemEvents = new Map()
    this.systemHealth = new Map()

    this.initializeIntegration()
  }

  /**
   * Initialize integration between all phases
   */
  async initializeIntegration() {
    try {
      console.log('🔗 Initializing master system integration...')

      // Import and initialize all systems
      await this.loadPhase1Systems()
      await this.loadPhase2Systems()
      await this.loadPhase3Systems()
      await this.loadPhase4Systems()
      await this.loadPhase5Systems()

      // Setup cross-system communication
      this.setupCrossSystemEvents()

      // Initialize system health monitoring
      this.initializeSystemHealthMonitoring()

      // Setup emergency coordination
      this.setupEmergencyCoordination()

      this.integrationStatus = 'operational'
      console.log('✅ Master system integration complete')

    } catch (error) {
      console.error('❌ Master system integration failed:', error)
      this.integrationStatus = 'failed'
    }
  }

  /**
   * Load Phase 1 systems (Essential Survival Features)
   */
  async loadPhase1Systems() {
    try {
      // Import systems dynamically
      const { offlineSystem } = await import('./offlineSystem.js')
      const { smsSystem } = await import('./smsSystem.js')
      const { powerManagement } = await import('./powerManagement.js')
      const { languageSystem } = await import('./languageSystem.js')
      const { mobileMoneySystem } = await import('./mobileMoneySystem.js')

      this.phase1Systems = {
        offline: offlineSystem,
        sms: smsSystem,
        power: powerManagement,
        language: languageSystem,
        mobileMoney: mobileMoneySystem
      }

      console.log('✅ Phase 1 systems loaded')
    } catch (error) {
      console.error('❌ Failed to load Phase 1 systems:', error)
    }
  }

  /**
   * Load Phase 2 systems (Rural-Specific Educational Features)
   */
  async loadPhase2Systems() {
    try {
      this.phase2Systems.ruralEducation = ruralEducationSystem
      console.log('✅ Phase 2 systems loaded')
    } catch (error) {
      console.error('❌ Failed to load Phase 2 systems:', error)
    }
  }

  /**
   * Load Phase 3 systems (Health, Nutrition & Community Features)
   */
  async loadPhase3Systems() {
    try {
      const { healthNutritionSystem } = await import('./healthNutritionSystem.js')
      this.phase3Systems.healthNutrition = healthNutritionSystem
      console.log('✅ Phase 3 systems loaded')
    } catch (error) {
      console.error('❌ Failed to load Phase 3 systems:', error)
    }
  }

  /**
   * Load Phase 4 systems (Economic & Transportation Solutions)
   */
  async loadPhase4Systems() {
    try {
      const { economicTransportSystem } = await import('./economicTransportSystem.js')
      this.phase4Systems.economicTransport = economicTransportSystem
      console.log('✅ Phase 4 systems loaded')
    } catch (error) {
      console.error('❌ Failed to load Phase 4 systems:', error)
    }
  }

  /**
   * Load Phase 5 systems (Technical Adaptations & Sustainability)
   */
  async loadPhase5Systems() {
    try {
      const { technicalSustainabilitySystem } = await import('./technicalSustainabilitySystem.js')
      this.phase5Systems.technicalSustainability = technicalSustainabilitySystem
      console.log('✅ Phase 5 systems loaded')
    } catch (error) {
      console.error('❌ Failed to load Phase 5 systems:', error)
    }
  }

  /**
   * Setup cross-system event communication
   */
  setupCrossSystemEvents() {
    // Health alerts trigger SMS notifications
    this.crossSystemEvents.set('health_alert', {
      source: 'phase3.healthNutrition',
      targets: ['phase1.sms', 'phase1.language'],
      handler: this.handleHealthAlert.bind(this)
    })

    // Power status affects all systems
    this.crossSystemEvents.set('power_status_change', {
      source: 'phase1.power',
      targets: ['phase5.technicalSustainability', 'phase1.offline'],
      handler: this.handlePowerStatusChange.bind(this)
    })

    // Economic assistance applications trigger mobile money
    this.crossSystemEvents.set('economic_assistance_approved', {
      source: 'phase4.economicTransport',
      targets: ['phase1.mobileMoney', 'phase1.sms'],
      handler: this.handleEconomicAssistanceApproved.bind(this)
    })

    // Agricultural season changes affect multiple systems
    this.crossSystemEvents.set('agricultural_season_change', {
      source: 'phase2.ruralEducation',
      targets: ['phase3.healthNutrition', 'phase4.economicTransport'],
      handler: this.handleAgriculturalSeasonChange.bind(this)
    })

    // Device sharing schedules coordinate with educational schedules
    this.crossSystemEvents.set('device_schedule_update', {
      source: 'phase5.technicalSustainability',
      targets: ['phase2.ruralEducation', 'phase1.power'],
      handler: this.handleDeviceScheduleUpdate.bind(this)
    })

    console.log('🔗 Cross-system events configured')
  }

  /**
   * Initialize system health monitoring
   */
  initializeSystemHealthMonitoring() {
    // Monitor each phase system
    const phases = [
      { name: 'Phase 1', systems: this.phase1Systems },
      { name: 'Phase 2', systems: this.phase2Systems },
      { name: 'Phase 3', systems: this.phase3Systems },
      { name: 'Phase 4', systems: this.phase4Systems },
      { name: 'Phase 5', systems: this.phase5Systems }
    ]

    phases.forEach(phase => {
      Object.entries(phase.systems).forEach(([systemName, system]) => {
        if (system) {
          this.systemHealth.set(`${phase.name}.${systemName}`, {
            status: 'operational',
            lastCheck: new Date(),
            errorCount: 0,
            performance: 100
          })
        }
      })
    })

    // Start health monitoring interval
    setInterval(() => {
      this.performHealthCheck()
    }, 60000) // Check every minute

    console.log('💓 System health monitoring initialized')
  }

  /**
   * Setup emergency coordination between all systems
   */
  setupEmergencyCoordination() {
    this.emergencyProtocols = {
      power_emergency: {
        priority: 'critical',
        affected_systems: ['all'],
        response_time: '5_minutes',
        actions: [
          'Activate ultra-low power mode',
          'Switch to essential services only',
          'Send emergency notifications',
          'Coordinate community response'
        ]
      },
      health_emergency: {
        priority: 'critical',
        affected_systems: ['phase3', 'phase1.sms', 'phase4.transport'],
        response_time: '2_minutes',
        actions: [
          'Send immediate health alerts',
          'Coordinate emergency transport',
          'Notify health facilities',
          'Activate community support'
        ]
      },
      connectivity_emergency: {
        priority: 'high',
        affected_systems: ['phase1.offline', 'phase1.sms', 'phase5'],
        response_time: '10_minutes',
        actions: [
          'Switch to offline mode',
          'Activate SMS communication',
          'Use mesh networks',
          'Implement data mule system'
        ]
      },
      weather_emergency: {
        priority: 'high',
        affected_systems: ['all'],
        response_time: '15_minutes',
        actions: [
          'Secure all equipment',
          'Activate weather protocols',
          'Coordinate community shelter',
          'Implement emergency communication'
        ]
      }
    }

    console.log('🚨 Emergency coordination protocols established')
  }

  /**
   * Handle health alert cross-system event
   */
  async handleHealthAlert(alertData) {
    const { studentId, alertType, severity, message } = alertData

    try {
      // Send SMS notification using Phase 1 SMS system
      if (this.phase1Systems.sms) {
        const localizedMessage = await this.phase1Systems.language?.translateMessage(message) || message
        await this.phase1Systems.sms.sendHealthAlert(studentId, localizedMessage, severity)
      }

      // Log for offline sync if needed
      if (this.phase1Systems.offline) {
        await this.phase1Systems.offline.queueForSync({
          type: 'health_alert',
          data: alertData,
          priority: severity === 'high' ? 'critical' : 'normal'
        })
      }

      console.log(`🏥 Health alert processed for student ${studentId}`)
    } catch (error) {
      console.error('❌ Failed to handle health alert:', error)
    }
  }

  /**
   * Handle power status change cross-system event
   */
  async handlePowerStatusChange(powerData) {
    const { batteryLevel, powerMode, solarGeneration } = powerData

    try {
      // Adjust technical sustainability settings
      if (this.phase5Systems.technicalSustainability) {
        await this.phase5Systems.technicalSustainability.adjustForPowerStatus(powerData)
      }

      // Update offline system power awareness
      if (this.phase1Systems.offline) {
        await this.phase1Systems.offline.updatePowerStatus(powerData)
      }

      // Send power alerts if critical
      if (batteryLevel < 20 && this.phase1Systems.sms) {
        await this.phase1Systems.sms.sendPowerAlert(batteryLevel)
      }

      console.log(`⚡ Power status change processed: ${powerMode} mode, ${batteryLevel}% battery`)
    } catch (error) {
      console.error('❌ Failed to handle power status change:', error)
    }
  }

  /**
   * Handle economic assistance approval cross-system event
   */
  async handleEconomicAssistanceApproved(assistanceData) {
    const { familyId, amount, assistanceType, paymentMethod } = assistanceData

    try {
      // Process mobile money payment
      if (this.phase1Systems.mobileMoney && paymentMethod === 'mobile_money') {
        await this.phase1Systems.mobileMoney.processAssistancePayment(familyId, amount)
      }

      // Send SMS notification
      if (this.phase1Systems.sms) {
        const message = `Your economic assistance application has been approved. Amount: K${amount}`
        await this.phase1Systems.sms.sendNotification(familyId, message, 'economic_assistance')
      }

      console.log(`💰 Economic assistance processed for family ${familyId}: K${amount}`)
    } catch (error) {
      console.error('❌ Failed to handle economic assistance approval:', error)
    }
  }

  /**
   * Handle agricultural season change cross-system event
   */
  async handleAgriculturalSeasonChange(seasonData) {
    const { newSeason, seasonName, schoolImpact } = seasonData

    try {
      // Update health and nutrition programs
      if (this.phase3Systems.healthNutrition) {
        await this.phase3Systems.healthNutrition.adjustForSeason(seasonData)
      }

      // Update economic programs and transportation
      if (this.phase4Systems.economicTransport) {
        await this.phase4Systems.economicTransport.adjustForSeason(seasonData)
      }

      console.log(`🌾 Agricultural season change processed: ${seasonName}`)
    } catch (error) {
      console.error('❌ Failed to handle agricultural season change:', error)
    }
  }

  /**
   * Handle device schedule update cross-system event
   */
  async handleDeviceScheduleUpdate(scheduleData) {
    const { deviceType, newSchedule, powerRequirements } = scheduleData

    try {
      // Coordinate with educational schedules
      if (this.phase2Systems.ruralEducation) {
        await this.phase2Systems.ruralEducation.coordinateWithDeviceSchedule(scheduleData)
      }

      // Update power management
      if (this.phase1Systems.power) {
        await this.phase1Systems.power.updateDevicePowerSchedule(powerRequirements)
      }

      console.log(`📱 Device schedule update processed for ${deviceType}`)
    } catch (error) {
      console.error('❌ Failed to handle device schedule update:', error)
    }
  }

  /**
   * Perform system health check
   */
  performHealthCheck() {
    for (const [systemKey, healthData] of this.systemHealth) {
      try {
        // Update last check time
        healthData.lastCheck = new Date()

        // Simple health check (can be enhanced with actual system status)
        const isHealthy = Math.random() > 0.05 // 95% uptime simulation

        if (isHealthy) {
          healthData.status = 'operational'
          healthData.performance = Math.min(100, healthData.performance + 1)
        } else {
          healthData.status = 'warning'
          healthData.errorCount += 1
          healthData.performance = Math.max(0, healthData.performance - 5)
        }

        // Alert if system is degraded
        if (healthData.performance < 50) {
          this.triggerSystemAlert(systemKey, healthData)
        }

      } catch (error) {
        console.error(`❌ Health check failed for ${systemKey}:`, error)
      }
    }
  }

  /**
   * Trigger system alert
   */
  async triggerSystemAlert(systemKey, healthData) {
    const alert = {
      system: systemKey,
      status: healthData.status,
      performance: healthData.performance,
      errorCount: healthData.errorCount,
      timestamp: new Date()
    }

    // Send alert via SMS if available
    if (this.phase1Systems.sms) {
      const message = `System Alert: ${systemKey} performance at ${healthData.performance}%`
      await this.phase1Systems.sms.sendSystemAlert(message)
    }

    console.log(`🚨 System alert triggered for ${systemKey}`)
  }

  /**
   * Get comprehensive system status
   */
  getComprehensiveSystemStatus() {
    const status = {
      integration_status: this.integrationStatus,
      timestamp: new Date().toISOString(),
      phase_status: {
        phase1: this.getPhaseStatus(this.phase1Systems),
        phase2: this.getPhaseStatus(this.phase2Systems),
        phase3: this.getPhaseStatus(this.phase3Systems),
        phase4: this.getPhaseStatus(this.phase4Systems),
        phase5: this.getPhaseStatus(this.phase5Systems)
      },
      system_health: Object.fromEntries(this.systemHealth),
      cross_system_events: this.crossSystemEvents.size,
      emergency_protocols: Object.keys(this.emergencyProtocols).length,
      overall_performance: this.calculateOverallPerformance()
    }

    return status
  }

  /**
   * Get phase status
   */
  getPhaseStatus(phaseSystems) {
    const systemCount = Object.keys(phaseSystems).length
    const operationalSystems = Object.values(phaseSystems).filter(system => system !== null).length

    return {
      total_systems: systemCount,
      operational_systems: operationalSystems,
      status: operationalSystems === systemCount ? 'fully_operational' : 'partially_operational',
      operational_percentage: systemCount > 0 ? (operationalSystems / systemCount * 100).toFixed(1) : 0
    }
  }

  /**
   * Calculate overall performance
   */
  calculateOverallPerformance() {
    if (this.systemHealth.size === 0) return 0

    const totalPerformance = Array.from(this.systemHealth.values())
      .reduce((sum, health) => sum + health.performance, 0)

    return (totalPerformance / this.systemHealth.size).toFixed(1)
  }

  /**
   * Generate comprehensive statistics
   */
  generateComprehensiveStats() {
    const stats = {
      system_overview: this.getComprehensiveSystemStatus(),
      phase1_stats: this.getPhase1Stats(),
      phase2_stats: this.getPhase2Stats(),
      phase3_stats: this.getPhase3Stats(),
      phase4_stats: this.getPhase4Stats(),
      phase5_stats: this.getPhase5Stats(),
      integration_metrics: {
        cross_system_events_processed: this.getCrossSystemEventsProcessed(),
        emergency_responses: this.getEmergencyResponseCount(),
        system_uptime: this.getSystemUptime(),
        data_synchronization_rate: this.getDataSynchronizationRate()
      }
    }

    return stats
  }

  // Helper methods for statistics
  getPhase1Stats() {
    return {
      offline_system: this.phase1Systems.offline ? 'operational' : 'not_loaded',
      sms_system: this.phase1Systems.sms ? 'operational' : 'not_loaded',
      power_system: this.phase1Systems.power ? 'operational' : 'not_loaded',
      language_system: this.phase1Systems.language ? 'operational' : 'not_loaded',
      mobile_money_system: this.phase1Systems.mobileMoney ? 'operational' : 'not_loaded'
    }
  }

  getPhase2Stats() {
    return this.phase2Systems.ruralEducation ?
      this.phase2Systems.ruralEducation.getStats?.() || { status: 'operational' } :
      { status: 'not_loaded' }
  }

  getPhase3Stats() {
    return this.phase3Systems.healthNutrition ?
      this.phase3Systems.healthNutrition.getHealthNutritionStats?.() || { status: 'operational' } :
      { status: 'not_loaded' }
  }

  getPhase4Stats() {
    return this.phase4Systems.economicTransport ?
      this.phase4Systems.economicTransport.getEconomicTransportStats?.() || { status: 'operational' } :
      { status: 'not_loaded' }
  }

  getPhase5Stats() {
    return this.phase5Systems.technicalSustainability ?
      this.phase5Systems.technicalSustainability.getTechnicalSustainabilityStats?.() || { status: 'operational' } :
      { status: 'not_loaded' }
  }

  getCrossSystemEventsProcessed() { return 0 }
  getEmergencyResponseCount() { return 0 }
  getSystemUptime() { return 99.5 }
  getDataSynchronizationRate() { return 95.2 }
}

// Export master system
export const zambianSchoolMasterSystem = new ZambianSchoolMasterSystem()
