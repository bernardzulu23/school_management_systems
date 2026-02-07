/**
 * SMS-Based Communication System for Rural Zambian Schools
 * Provides feature phone compatibility and USSD integration
 * Designed for areas with limited smartphone penetration
 */

export class SMSSystem {
  constructor() {
    this.smsGateway = null
    this.ussdCodes = new Map()
    this.smsTemplates = new Map()
    this.phoneNumberRegistry = new Map()
    this.messageQueue = []
    this.deliveryReports = new Map()
    
    this.initializeSMSGateway()
    this.setupUSSDCodes()
    this.loadSMSTemplates()
    this.startMessageProcessor()
  }

  /**
   * Initialize SMS gateway for Zambian networks
   */
  initializeSMSGateway() {
    // Configuration for major Zambian mobile networks
    this.networkConfig = {
      airtel: {
        gateway: 'https://api.airtel.zm/sms',
        shortCode: '123',
        ussdPrefix: '*123#',
        apiKey: process.env.REACT_APP_AIRTEL_SMS_KEY
      },
      mtn: {
        gateway: 'https://api.mtn.zm/sms',
        shortCode: '124',
        ussdPrefix: '*124#',
        apiKey: process.env.REACT_APP_MTN_SMS_KEY
      },
      zamtel: {
        gateway: 'https://api.zamtel.zm/sms',
        shortCode: '125',
        ussdPrefix: '*125#',
        apiKey: process.env.REACT_APP_ZAMTEL_SMS_KEY
      }
    }
    
    console.log('📱 SMS Gateway initialized for Zambian networks')
  }

  /**
   * Setup USSD codes for different functions
   */
  setupUSSDCodes() {
    // Student functions
    this.ussdCodes.set('*123*1#', {
      function: 'check_attendance',
      description: 'Check your attendance',
      userType: 'student',
      handler: this.handleAttendanceCheck.bind(this)
    })
    
    this.ussdCodes.set('*123*2#', {
      function: 'check_grades',
      description: 'Check your grades',
      userType: 'student',
      handler: this.handleGradeCheck.bind(this)
    })
    
    this.ussdCodes.set('*123*3#', {
      function: 'check_assignments',
      description: 'Check assignments',
      userType: 'student',
      handler: this.handleAssignmentCheck.bind(this)
    })
    
    this.ussdCodes.set('*123*4#', {
      function: 'check_timetable',
      description: 'Check today\'s timetable',
      userType: 'student',
      handler: this.handleTimetableCheck.bind(this)
    })
    
    // Teacher functions
    this.ussdCodes.set('*123*11#', {
      function: 'mark_attendance',
      description: 'Mark class attendance',
      userType: 'teacher',
      handler: this.handleAttendanceMarking.bind(this)
    })
    
    this.ussdCodes.set('*123*12#', {
      function: 'send_grades',
      description: 'Submit student grades',
      userType: 'teacher',
      handler: this.handleGradeSubmission.bind(this)
    })
    
    this.ussdCodes.set('*123*13#', {
      function: 'class_summary',
      description: 'Get class summary',
      userType: 'teacher',
      handler: this.handleClassSummary.bind(this)
    })
    
    // Parent functions
    this.ussdCodes.set('*123*21#', {
      function: 'child_progress',
      description: 'Check child\'s progress',
      userType: 'parent',
      handler: this.handleChildProgress.bind(this)
    })
    
    this.ussdCodes.set('*123*22#', {
      function: 'fee_balance',
      description: 'Check fee balance',
      userType: 'parent',
      handler: this.handleFeeBalance.bind(this)
    })
    
    // Emergency functions
    this.ussdCodes.set('*123*911#', {
      function: 'emergency_alert',
      description: 'Send emergency alert',
      userType: 'all',
      handler: this.handleEmergencyAlert.bind(this)
    })
    
    console.log(`📞 ${this.ussdCodes.size} USSD codes configured`)
  }

  /**
   * Load SMS templates for different message types
   */
  loadSMSTemplates() {
    // English templates
    this.smsTemplates.set('attendance_summary_en', {
      template: 'Hello {name}, your attendance: {percentage}% ({present}/{total} days). Keep it up!',
      maxLength: 160,
      language: 'en'
    })
    
    this.smsTemplates.set('grade_notification_en', {
      template: '{name}, your {subject} grade: {grade}. {comment}',
      maxLength: 160,
      language: 'en'
    })
    
    this.smsTemplates.set('assignment_reminder_en', {
      template: 'Reminder: {assignment} due {date}. Submit on time!',
      maxLength: 160,
      language: 'en'
    })
    
    this.smsTemplates.set('fee_reminder_en', {
      template: 'Fee reminder: K{amount} due {date}. Pay via mobile money.',
      maxLength: 160,
      language: 'en'
    })
    
    // Bemba templates
    this.smsTemplates.set('attendance_summary_bem', {
      template: 'Mwaiseni {name}, ukuya kwenu: {percentage}% ({present}/{total} insiku). Pitilisheni!',
      maxLength: 160,
      language: 'bem'
    })
    
    this.smsTemplates.set('grade_notification_bem', {
      template: '{name}, amamenso yenu ya {subject}: {grade}. {comment}',
      maxLength: 160,
      language: 'bem'
    })
    
    // Tonga templates
    this.smsTemplates.set('attendance_summary_ton', {
      template: 'Mwabonwa {name}, kuyinka kwenu: {percentage}% ({present}/{total} mazuba). Endelezeni!',
      maxLength: 160,
      language: 'ton'
    })
    
    // Nyanja templates
    this.smsTemplates.set('attendance_summary_nya', {
      template: 'Muli bwanji {name}, kupita kwanu: {percentage}% ({present}/{total} masiku). Pitirizani!',
      maxLength: 160,
      language: 'nya'
    })
    
    console.log(`💬 ${this.smsTemplates.size} SMS templates loaded`)
  }

  /**
   * Register phone number with user information
   */
  registerPhoneNumber(phoneNumber, userInfo) {
    const cleanNumber = this.cleanPhoneNumber(phoneNumber)
    
    this.phoneNumberRegistry.set(cleanNumber, {
      ...userInfo,
      registeredAt: new Date().toISOString(),
      verified: false,
      preferredLanguage: userInfo.language || 'en'
    })
    
    // Send verification SMS
    this.sendVerificationSMS(cleanNumber, userInfo.name)
    
    return cleanNumber
  }

  /**
   * Clean and format phone number for Zambian format
   */
  cleanPhoneNumber(phoneNumber) {
    // Remove all non-digits
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // Handle different Zambian number formats
    if (cleaned.startsWith('260')) {
      // Already has country code
      return '+' + cleaned
    } else if (cleaned.startsWith('0')) {
      // Remove leading 0 and add country code
      return '+260' + cleaned.substring(1)
    } else if (cleaned.length === 9) {
      // Add country code
      return '+260' + cleaned
    }
    
    return '+260' + cleaned
  }

  /**
   * Send verification SMS
   */
  async sendVerificationSMS(phoneNumber, name) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000)
    
    const message = `Hello ${name}! Your school SMS verification code is: ${verificationCode}. Reply with this code to activate SMS services.`
    
    await this.sendSMS(phoneNumber, message, 'verification')
    
    // Store verification code temporarily
    setTimeout(() => {
      this.verificationCodes?.delete(phoneNumber)
    }, 300000) // 5 minutes
    
    if (!this.verificationCodes) {
      this.verificationCodes = new Map()
    }
    this.verificationCodes.set(phoneNumber, verificationCode)
  }

  /**
   * Send SMS message
   */
  async sendSMS(phoneNumber, message, messageType = 'general', priority = 'normal') {
    const cleanNumber = this.cleanPhoneNumber(phoneNumber)
    const network = this.detectNetwork(cleanNumber)
    
    const smsData = {
      id: this.generateMessageId(),
      to: cleanNumber,
      message: message.substring(0, 160), // SMS character limit
      messageType,
      priority,
      network,
      timestamp: new Date().toISOString(),
      status: 'pending'
    }
    
    // Add to queue
    this.messageQueue.push(smsData)
    
    // Process immediately for high priority
    if (priority === 'high') {
      await this.processMessage(smsData)
    }
    
    return smsData.id
  }

  /**
   * Detect mobile network from phone number
   */
  detectNetwork(phoneNumber) {
    const number = phoneNumber.replace('+260', '')
    
    // Airtel prefixes
    if (['96', '97', '76', '77'].some(prefix => number.startsWith(prefix))) {
      return 'airtel'
    }
    
    // MTN prefixes
    if (['95', '96', '75', '78'].some(prefix => number.startsWith(prefix))) {
      return 'mtn'
    }
    
    // Zamtel prefixes
    if (['94', '21', '22', '23'].some(prefix => number.startsWith(prefix))) {
      return 'zamtel'
    }
    
    return 'unknown'
  }

  /**
   * Process SMS message through appropriate gateway
   */
  async processMessage(smsData) {
    try {
      const networkConfig = this.networkConfig[smsData.network]
      
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${smsData.network}`)
      }
      
      const response = await fetch(networkConfig.gateway, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${networkConfig.apiKey}`
        },
        body: JSON.stringify({
          to: smsData.to,
          message: smsData.message,
          from: networkConfig.shortCode
        })
      })
      
      if (response.ok) {
        smsData.status = 'sent'
        smsData.sentAt = new Date().toISOString()
        
        const result = await response.json()
        smsData.gatewayId = result.messageId
        
        console.log(`📱 SMS sent to ${smsData.to}: ${smsData.message.substring(0, 50)}...`)
      } else {
        throw new Error(`Gateway error: ${response.status}`)
      }
      
    } catch (error) {
      console.error(`Failed to send SMS to ${smsData.to}:`, error)
      smsData.status = 'failed'
      smsData.error = error.message
      
      // Retry logic for failed messages
      if (smsData.retryCount < 3) {
        smsData.retryCount = (smsData.retryCount || 0) + 1
        smsData.status = 'pending'
        
        // Re-queue with delay
        setTimeout(() => {
          this.messageQueue.push(smsData)
        }, Math.pow(2, smsData.retryCount) * 1000)
      }
    }
    
    // Store delivery report
    this.deliveryReports.set(smsData.id, smsData)
  }

  /**
   * Handle incoming USSD request
   */
  async handleUSSDRequest(phoneNumber, ussdCode, sessionId) {
    const cleanNumber = this.cleanPhoneNumber(phoneNumber)
    const userInfo = this.phoneNumberRegistry.get(cleanNumber)
    
    if (!userInfo) {
      return this.createUSSDResponse(
        'Welcome! Please register first by sending your name to this number.',
        'end'
      )
    }
    
    const ussdHandler = this.ussdCodes.get(ussdCode)
    
    if (!ussdHandler) {
      return this.createUSSDMainMenu(userInfo.userType)
    }
    
    // Check user permissions
    if (ussdHandler.userType !== 'all' && ussdHandler.userType !== userInfo.userType) {
      return this.createUSSDResponse(
        'You do not have permission to access this function.',
        'end'
      )
    }
    
    // Execute handler
    try {
      return await ussdHandler.handler(userInfo, sessionId)
    } catch (error) {
      console.error('USSD handler error:', error)
      return this.createUSSDResponse(
        'Service temporarily unavailable. Please try again later.',
        'end'
      )
    }
  }

  /**
   * Create USSD main menu based on user type
   */
  createUSSDMainMenu(userType) {
    let menu = 'School Management System\n'
    
    if (userType === 'student') {
      menu += '1. Check Attendance\n'
      menu += '2. Check Grades\n'
      menu += '3. Check Assignments\n'
      menu += '4. Today\'s Timetable\n'
    } else if (userType === 'teacher') {
      menu += '11. Mark Attendance\n'
      menu += '12. Submit Grades\n'
      menu += '13. Class Summary\n'
    } else if (userType === 'parent') {
      menu += '21. Child\'s Progress\n'
      menu += '22. Fee Balance\n'
    }
    
    menu += '911. Emergency Alert'
    
    return this.createUSSDResponse(menu, 'continue')
  }

  /**
   * Create USSD response object
   */
  createUSSDResponse(message, action = 'continue') {
    return {
      message: message.substring(0, 182), // USSD character limit
      action, // 'continue' or 'end'
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Handle attendance check USSD request
   */
  async handleAttendanceCheck(userInfo, sessionId) {
    try {
      // Simulate fetching attendance data
      const attendanceData = await this.fetchUserAttendance(userInfo.userId)
      
      const message = `Attendance Summary:
Present: ${attendanceData.present} days
Absent: ${attendanceData.absent} days
Percentage: ${attendanceData.percentage}%
Last updated: ${attendanceData.lastUpdated}`
      
      return this.createUSSDResponse(message, 'end')
    } catch (error) {
      return this.createUSSDResponse('Unable to fetch attendance data.', 'end')
    }
  }

  /**
   * Handle grade check USSD request
   */
  async handleGradeCheck(userInfo, sessionId) {
    try {
      const grades = await this.fetchUserGrades(userInfo.userId)
      
      let message = 'Recent Grades:\n'
      grades.slice(0, 3).forEach(grade => {
        message += `${grade.subject}: ${grade.grade}\n`
      })
      
      return this.createUSSDResponse(message, 'end')
    } catch (error) {
      return this.createUSSDResponse('Unable to fetch grades.', 'end')
    }
  }

  /**
   * Handle assignment check USSD request
   */
  async handleAssignmentCheck(userInfo, sessionId) {
    try {
      const assignments = await this.fetchUserAssignments(userInfo.userId)
      
      let message = 'Pending Assignments:\n'
      assignments.slice(0, 2).forEach(assignment => {
        message += `${assignment.subject}: Due ${assignment.dueDate}\n`
      })
      
      return this.createUSSDResponse(message, 'end')
    } catch (error) {
      return this.createUSSDResponse('Unable to fetch assignments.', 'end')
    }
  }

  /**
   * Handle timetable check USSD request
   */
  async handleTimetableCheck(userInfo, sessionId) {
    try {
      const timetable = await this.fetchTodaysTimetable(userInfo.userId)
      
      let message = 'Today\'s Classes:\n'
      timetable.slice(0, 3).forEach(period => {
        message += `${period.time}: ${period.subject}\n`
      })
      
      return this.createUSSDResponse(message, 'end')
    } catch (error) {
      return this.createUSSDResponse('Unable to fetch timetable.', 'end')
    }
  }

  /**
   * Handle emergency alert
   */
  async handleEmergencyAlert(userInfo, sessionId) {
    // Log emergency alert
    console.log(`🚨 Emergency alert from ${userInfo.name} (${userInfo.phoneNumber})`)
    
    // Notify relevant authorities
    await this.notifyEmergencyContacts(userInfo)
    
    return this.createUSSDResponse(
      'Emergency alert sent. Help is on the way. Stay safe!',
      'end'
    )
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(phoneNumbers, message, messageType = 'bulk') {
    const results = []
    
    for (const phoneNumber of phoneNumbers) {
      try {
        const messageId = await this.sendSMS(phoneNumber, message, messageType)
        results.push({ phoneNumber, messageId, status: 'queued' })
      } catch (error) {
        results.push({ phoneNumber, error: error.message, status: 'failed' })
      }
    }
    
    return results
  }

  /**
   * Start message processor for queued messages
   */
  startMessageProcessor() {
    setInterval(async () => {
      if (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()
        await this.processMessage(message)
      }
    }, 2000) // Process every 2 seconds to avoid rate limiting
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get SMS statistics
   */
  getSMSStats() {
    const total = this.deliveryReports.size
    const sent = Array.from(this.deliveryReports.values()).filter(r => r.status === 'sent').length
    const failed = Array.from(this.deliveryReports.values()).filter(r => r.status === 'failed').length
    const pending = this.messageQueue.length
    
    return {
      total,
      sent,
      failed,
      pending,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(2) : 0,
      registeredUsers: this.phoneNumberRegistry.size
    }
  }

  // Placeholder methods for data fetching (to be implemented with actual API calls)
  async fetchUserAttendance(userId) {
    return { present: 18, absent: 2, percentage: 90, lastUpdated: '2024-01-15' }
  }

  async fetchUserGrades(userId) {
    return [
      { subject: 'Math', grade: 'A' },
      { subject: 'English', grade: 'B+' },
      { subject: 'Science', grade: 'A-' }
    ]
  }

  async fetchUserAssignments(userId) {
    return [
      { subject: 'Math', dueDate: '2024-01-20' },
      { subject: 'English', dueDate: '2024-01-22' }
    ]
  }

  async fetchTodaysTimetable(userId) {
    return [
      { time: '08:00', subject: 'Math' },
      { time: '09:00', subject: 'English' },
      { time: '10:00', subject: 'Science' }
    ]
  }

  async notifyEmergencyContacts(userInfo) {
    // Implementation for emergency notifications
    console.log('Emergency contacts notified')
  }
}

// Export singleton instance
export const smsSystem = new SMSSystem()
