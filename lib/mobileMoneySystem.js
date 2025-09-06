/**
 * Mobile Money Integration System for Rural Zambian Schools
 * Supports Airtel Money, MTN Mobile Money, and Zamtel Kwacha
 * Designed for fee payments, micro-transactions, and community savings
 */

export class MobileMoneySystem {
  constructor() {
    this.supportedProviders = new Map()
    this.transactionHistory = []
    this.paymentMethods = new Map()
    this.feeStructure = new Map()
    this.communityFunds = new Map()
    this.microLending = new Map()
    
    this.initializeProviders()
    this.setupPaymentMethods()
    this.loadFeeStructure()
    this.initializeCommunityFeatures()
  }

  /**
   * Initialize mobile money providers for Zambia
   */
  initializeProviders() {
    // Airtel Money configuration
    this.supportedProviders.set('airtel', {
      name: 'Airtel Money',
      code: 'airtel',
      shortCode: '*115#',
      apiEndpoint: 'https://api.airtel.zm/money',
      currency: 'ZMW',
      maxTransaction: 50000, // K50,000
      minTransaction: 1, // K1
      dailyLimit: 200000, // K200,000
      fees: {
        deposit: 0, // Free deposits
        withdrawal: 0.01, // 1% withdrawal fee
        transfer: 0.005, // 0.5% transfer fee
        billPayment: 0.02 // 2% bill payment fee
      },
      prefixes: ['96', '97', '76', '77'],
      features: ['payments', 'transfers', 'savings', 'loans'],
      apiKey: process.env.REACT_APP_AIRTEL_MONEY_KEY
    })
    
    // MTN Mobile Money configuration
    this.supportedProviders.set('mtn', {
      name: 'MTN Mobile Money',
      code: 'mtn',
      shortCode: '*303#',
      apiEndpoint: 'https://api.mtn.zm/money',
      currency: 'ZMW',
      maxTransaction: 30000, // K30,000
      minTransaction: 1, // K1
      dailyLimit: 150000, // K150,000
      fees: {
        deposit: 0, // Free deposits
        withdrawal: 0.015, // 1.5% withdrawal fee
        transfer: 0.01, // 1% transfer fee
        billPayment: 0.025 // 2.5% bill payment fee
      },
      prefixes: ['95', '96', '75', '78'],
      features: ['payments', 'transfers', 'international'],
      apiKey: process.env.REACT_APP_MTN_MONEY_KEY
    })
    
    // Zamtel Kwacha configuration
    this.supportedProviders.set('zamtel', {
      name: 'Zamtel Kwacha',
      code: 'zamtel',
      shortCode: '*156#',
      apiEndpoint: 'https://api.zamtel.zm/money',
      currency: 'ZMW',
      maxTransaction: 20000, // K20,000
      minTransaction: 1, // K1
      dailyLimit: 100000, // K100,000
      fees: {
        deposit: 0, // Free deposits
        withdrawal: 0.02, // 2% withdrawal fee
        transfer: 0.015, // 1.5% transfer fee
        billPayment: 0.03 // 3% bill payment fee
      },
      prefixes: ['94', '21', '22', '23'],
      features: ['payments', 'transfers', 'rural_focus'],
      apiKey: process.env.REACT_APP_ZAMTEL_MONEY_KEY
    })
    
    console.log(`💰 ${this.supportedProviders.size} mobile money providers initialized`)
  }

  /**
   * Setup payment methods and fee categories
   */
  setupPaymentMethods() {
    // School fee payment methods
    this.paymentMethods.set('school_fees', {
      name: 'School Fees',
      description: 'Tuition and examination fees',
      allowedProviders: ['airtel', 'mtn', 'zamtel'],
      installmentSupported: true,
      reminderEnabled: true,
      gracePeriod: 30 // 30 days grace period
    })
    
    this.paymentMethods.set('uniform_fees', {
      name: 'Uniform & Books',
      description: 'School uniforms and textbooks',
      allowedProviders: ['airtel', 'mtn', 'zamtel'],
      installmentSupported: true,
      reminderEnabled: true,
      gracePeriod: 14 // 14 days grace period
    })
    
    this.paymentMethods.set('meal_fees', {
      name: 'Meal Program',
      description: 'School feeding program',
      allowedProviders: ['airtel', 'mtn', 'zamtel'],
      installmentSupported: false,
      reminderEnabled: true,
      gracePeriod: 7 // 7 days grace period
    })
    
    this.paymentMethods.set('transport_fees', {
      name: 'Transport',
      description: 'School transport services',
      allowedProviders: ['airtel', 'mtn', 'zamtel'],
      installmentSupported: true,
      reminderEnabled: true,
      gracePeriod: 7 // 7 days grace period
    })
    
    this.paymentMethods.set('community_fund', {
      name: 'Community Development',
      description: 'School infrastructure and community projects',
      allowedProviders: ['airtel', 'mtn', 'zamtel'],
      installmentSupported: true,
      reminderEnabled: false,
      gracePeriod: 0 // Voluntary contributions
    })
    
    console.log(`💳 ${this.paymentMethods.size} payment methods configured`)
  }

  /**
   * Load fee structure for different school levels
   */
  loadFeeStructure() {
    // Primary school fees (Grades 1-7)
    this.feeStructure.set('primary', {
      tuition: {
        term1: 150, // K150 per term
        term2: 150,
        term3: 150,
        annual: 450
      },
      examination: {
        grade7: 50 // K50 for Grade 7 exams
      },
      uniform: 200, // K200 for uniform
      books: 100, // K100 for books
      meals: 30, // K30 per month
      transport: 50 // K50 per month
    })
    
    // Secondary school fees (Grades 8-12)
    this.feeStructure.set('secondary', {
      tuition: {
        term1: 300, // K300 per term
        term2: 300,
        term3: 300,
        annual: 900
      },
      examination: {
        grade9: 100, // K100 for Grade 9 exams
        grade12: 200 // K200 for Grade 12 exams
      },
      uniform: 350, // K350 for uniform
      books: 250, // K250 for books
      meals: 50, // K50 per month
      transport: 80 // K80 per month
    })
    
    console.log('💰 Fee structure loaded')
  }

  /**
   * Initialize community features
   */
  initializeCommunityFeatures() {
    // Community savings groups
    this.communityFunds.set('infrastructure', {
      name: 'School Infrastructure Fund',
      description: 'Building classrooms, libraries, and facilities',
      target: 50000, // K50,000 target
      current: 0,
      contributors: [],
      minimumContribution: 10 // K10 minimum
    })
    
    this.communityFunds.set('technology', {
      name: 'Technology Fund',
      description: 'Computers, tablets, and internet connectivity',
      target: 30000, // K30,000 target
      current: 0,
      contributors: [],
      minimumContribution: 5 // K5 minimum
    })
    
    this.communityFunds.set('emergency', {
      name: 'Emergency Fund',
      description: 'Support for students in financial difficulty',
      target: 20000, // K20,000 target
      current: 0,
      contributors: [],
      minimumContribution: 5 // K5 minimum
    })
    
    console.log('🤝 Community features initialized')
  }

  /**
   * Detect mobile money provider from phone number
   */
  detectProvider(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    const prefix = cleanNumber.substring(cleanNumber.length - 9, cleanNumber.length - 7)
    
    for (const [code, provider] of this.supportedProviders) {
      if (provider.prefixes.includes(prefix)) {
        return code
      }
    }
    
    return null
  }

  /**
   * Process school fee payment
   */
  async processPayment(paymentData) {
    const {
      phoneNumber,
      amount,
      feeType,
      studentId,
      reference,
      provider = null
    } = paymentData
    
    // Detect provider if not specified
    const detectedProvider = provider || this.detectProvider(phoneNumber)
    
    if (!detectedProvider) {
      throw new Error('Unsupported mobile money provider')
    }
    
    const providerConfig = this.supportedProviders.get(detectedProvider)
    
    // Validate amount limits
    if (amount < providerConfig.minTransaction) {
      throw new Error(`Minimum transaction amount is K${providerConfig.minTransaction}`)
    }
    
    if (amount > providerConfig.maxTransaction) {
      throw new Error(`Maximum transaction amount is K${providerConfig.maxTransaction}`)
    }
    
    // Calculate fees
    const feePercentage = providerConfig.fees.billPayment
    const transactionFee = amount * feePercentage
    const totalAmount = amount + transactionFee
    
    // Create transaction record
    const transaction = {
      id: this.generateTransactionId(),
      phoneNumber,
      amount,
      transactionFee,
      totalAmount,
      feeType,
      studentId,
      reference,
      provider: detectedProvider,
      status: 'pending',
      timestamp: new Date().toISOString(),
      retryCount: 0
    }
    
    try {
      // Process payment through provider API
      const result = await this.callProviderAPI(detectedProvider, 'payment', {
        phoneNumber,
        amount: totalAmount,
        reference: transaction.id,
        description: `School fee payment - ${feeType}`
      })
      
      transaction.status = 'completed'
      transaction.providerTransactionId = result.transactionId
      transaction.completedAt = new Date().toISOString()
      
      // Record successful payment
      this.transactionHistory.push(transaction)
      
      // Send confirmation SMS
      await this.sendPaymentConfirmation(transaction)
      
      console.log(`✅ Payment processed: K${amount} from ${phoneNumber}`)
      
      return transaction
      
    } catch (error) {
      transaction.status = 'failed'
      transaction.error = error.message
      transaction.failedAt = new Date().toISOString()
      
      this.transactionHistory.push(transaction)
      
      console.error(`❌ Payment failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Setup payment installments
   */
  async setupInstallmentPlan(installmentData) {
    const {
      studentId,
      totalAmount,
      numberOfInstallments,
      feeType,
      phoneNumber,
      startDate
    } = installmentData
    
    const installmentAmount = Math.ceil(totalAmount / numberOfInstallments)
    const plan = {
      id: this.generatePlanId(),
      studentId,
      totalAmount,
      numberOfInstallments,
      installmentAmount,
      feeType,
      phoneNumber,
      startDate: new Date(startDate),
      status: 'active',
      installments: []
    }
    
    // Create individual installments
    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)
      
      plan.installments.push({
        installmentNumber: i + 1,
        amount: installmentAmount,
        dueDate,
        status: 'pending',
        reminderSent: false
      })
    }
    
    // Store installment plan
    localStorage.setItem(`installment_${plan.id}`, JSON.stringify(plan))
    
    console.log(`📅 Installment plan created: ${numberOfInstallments} payments of K${installmentAmount}`)
    
    return plan
  }

  /**
   * Process community fund contribution
   */
  async contributeToCommunityFund(contributionData) {
    const {
      phoneNumber,
      amount,
      fundType,
      contributorName,
      anonymous = false
    } = contributionData
    
    const fund = this.communityFunds.get(fundType)
    
    if (!fund) {
      throw new Error('Invalid community fund type')
    }
    
    if (amount < fund.minimumContribution) {
      throw new Error(`Minimum contribution is K${fund.minimumContribution}`)
    }
    
    // Process payment
    const transaction = await this.processPayment({
      phoneNumber,
      amount,
      feeType: 'community_fund',
      reference: `FUND_${fundType.toUpperCase()}_${Date.now()}`
    })
    
    // Update fund
    fund.current += amount
    fund.contributors.push({
      name: anonymous ? 'Anonymous' : contributorName,
      amount,
      date: new Date().toISOString(),
      transactionId: transaction.id
    })
    
    // Check if target reached
    if (fund.current >= fund.target) {
      await this.notifyFundTargetReached(fundType, fund)
    }
    
    console.log(`🤝 Community contribution: K${amount} to ${fund.name}`)
    
    return {
      transaction,
      fund: {
        name: fund.name,
        current: fund.current,
        target: fund.target,
        progress: (fund.current / fund.target * 100).toFixed(1)
      }
    }
  }

  /**
   * Setup micro-lending for families
   */
  async setupMicroLoan(loanData) {
    const {
      phoneNumber,
      amount,
      purpose,
      guarantorPhone,
      repaymentPeriod, // months
      applicantName
    } = loanData
    
    const interestRate = 0.05 // 5% monthly interest
    const monthlyPayment = (amount * (1 + interestRate * repaymentPeriod)) / repaymentPeriod
    
    const loan = {
      id: this.generateLoanId(),
      phoneNumber,
      amount,
      purpose,
      guarantorPhone,
      repaymentPeriod,
      monthlyPayment: Math.ceil(monthlyPayment),
      applicantName,
      status: 'pending_approval',
      appliedAt: new Date().toISOString(),
      interestRate,
      totalRepayment: Math.ceil(monthlyPayment * repaymentPeriod)
    }
    
    // Store loan application
    this.microLending.set(loan.id, loan)
    
    // Notify guarantor
    await this.notifyGuarantor(guarantorPhone, loan)
    
    console.log(`💳 Micro-loan application: K${amount} for ${purpose}`)
    
    return loan
  }

  /**
   * Check fee balance for student
   */
  async checkFeeBalance(studentId) {
    // Get student's fee structure
    const studentLevel = await this.getStudentLevel(studentId)
    const fees = this.feeStructure.get(studentLevel)
    
    // Calculate total fees due
    const currentTerm = this.getCurrentTerm()
    let totalDue = 0
    let totalPaid = 0
    
    // Calculate based on current term
    if (currentTerm <= 3) {
      totalDue = fees.tuition[`term${currentTerm}`]
    }
    
    // Add other fees
    totalDue += fees.meals * this.getCurrentMonth()
    totalDue += fees.transport * this.getCurrentMonth()
    
    // Calculate paid amount from transaction history
    const studentTransactions = this.transactionHistory.filter(
      t => t.studentId === studentId && t.status === 'completed'
    )
    
    totalPaid = studentTransactions.reduce((sum, t) => sum + t.amount, 0)
    
    const balance = totalDue - totalPaid
    
    return {
      studentId,
      totalDue,
      totalPaid,
      balance: Math.max(0, balance),
      overpayment: Math.max(0, -balance),
      lastPayment: studentTransactions[studentTransactions.length - 1],
      paymentHistory: studentTransactions
    }
  }

  /**
   * Send payment reminders
   */
  async sendPaymentReminders() {
    const overdueStudents = await this.getOverdueStudents()
    
    for (const student of overdueStudents) {
      const balance = await this.checkFeeBalance(student.id)
      
      if (balance.balance > 0) {
        await this.sendReminderSMS(student.phoneNumber, {
          studentName: student.name,
          amount: balance.balance,
          dueDate: student.dueDate
        })
      }
    }
    
    console.log(`📱 Payment reminders sent to ${overdueStudents.length} students`)
  }

  /**
   * Generate payment reports
   */
  generatePaymentReport(period = 'monthly') {
    const now = new Date()
    let startDate
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'termly':
        startDate = this.getTermStartDate()
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1)
    }
    
    const periodTransactions = this.transactionHistory.filter(
      t => new Date(t.timestamp) >= startDate && t.status === 'completed'
    )
    
    const report = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalTransactions: periodTransactions.length,
      totalAmount: periodTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalFees: periodTransactions.reduce((sum, t) => sum + t.transactionFee, 0),
      byProvider: {},
      byFeeType: {},
      averageTransaction: 0
    }
    
    // Group by provider
    for (const transaction of periodTransactions) {
      if (!report.byProvider[transaction.provider]) {
        report.byProvider[transaction.provider] = {
          count: 0,
          amount: 0,
          fees: 0
        }
      }
      
      report.byProvider[transaction.provider].count++
      report.byProvider[transaction.provider].amount += transaction.amount
      report.byProvider[transaction.provider].fees += transaction.transactionFee
    }
    
    // Group by fee type
    for (const transaction of periodTransactions) {
      if (!report.byFeeType[transaction.feeType]) {
        report.byFeeType[transaction.feeType] = {
          count: 0,
          amount: 0
        }
      }
      
      report.byFeeType[transaction.feeType].count++
      report.byFeeType[transaction.feeType].amount += transaction.amount
    }
    
    // Calculate average
    report.averageTransaction = report.totalTransactions > 0 ? 
      report.totalAmount / report.totalTransactions : 0
    
    return report
  }

  /**
   * Call provider API
   */
  async callProviderAPI(provider, action, data) {
    const providerConfig = this.supportedProviders.get(provider)
    
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`)
    }
    
    const endpoint = `${providerConfig.apiEndpoint}/${action}`
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
        'X-Provider': provider
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`Provider API error: ${response.status}`)
    }
    
    return await response.json()
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(transaction) {
    const message = `Payment confirmed! K${transaction.amount} received for ${transaction.feeType}. Ref: ${transaction.id}. Thank you!`
    
    // Use SMS system to send confirmation
    if (window.smsSystem) {
      await window.smsSystem.sendSMS(transaction.phoneNumber, message, 'payment_confirmation', 'high')
    }
  }

  /**
   * Send reminder SMS
   */
  async sendReminderSMS(phoneNumber, reminderData) {
    const message = `Reminder: ${reminderData.studentName}, school fee balance K${reminderData.amount}. Pay via mobile money. Due: ${reminderData.dueDate}`
    
    if (window.smsSystem) {
      await window.smsSystem.sendSMS(phoneNumber, message, 'payment_reminder', 'normal')
    }
  }

  /**
   * Get mobile money statistics
   */
  getMobileMoneyStats() {
    const completedTransactions = this.transactionHistory.filter(t => t.status === 'completed')
    const totalAmount = completedTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalFees = completedTransactions.reduce((sum, t) => sum + t.transactionFee, 0)
    
    const providerStats = {}
    for (const [code, provider] of this.supportedProviders) {
      const providerTransactions = completedTransactions.filter(t => t.provider === code)
      providerStats[code] = {
        name: provider.name,
        transactions: providerTransactions.length,
        amount: providerTransactions.reduce((sum, t) => sum + t.amount, 0),
        marketShare: completedTransactions.length > 0 ? 
          (providerTransactions.length / completedTransactions.length * 100).toFixed(1) : 0
      }
    }
    
    return {
      totalTransactions: completedTransactions.length,
      totalAmount,
      totalFees,
      averageTransaction: completedTransactions.length > 0 ? totalAmount / completedTransactions.length : 0,
      successRate: this.transactionHistory.length > 0 ? 
        (completedTransactions.length / this.transactionHistory.length * 100).toFixed(1) : 0,
      providerStats,
      communityFunds: Object.fromEntries(this.communityFunds),
      activeLoans: Array.from(this.microLending.values()).filter(l => l.status === 'active').length
    }
  }

  // Helper methods
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generatePlanId() {
    return `PLAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateLoanId() {
    return `LOAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async getStudentLevel(studentId) {
    // Placeholder - implement with actual student data
    return 'primary'
  }

  getCurrentTerm() {
    const month = new Date().getMonth() + 1
    if (month >= 1 && month <= 4) return 1
    if (month >= 5 && month <= 8) return 2
    return 3
  }

  getCurrentMonth() {
    return new Date().getMonth() + 1
  }

  getTermStartDate() {
    const year = new Date().getFullYear()
    const term = this.getCurrentTerm()
    
    switch (term) {
      case 1: return new Date(year, 0, 15) // January 15
      case 2: return new Date(year, 4, 1)  // May 1
      case 3: return new Date(year, 8, 1)  // September 1
      default: return new Date(year, 0, 1)
    }
  }

  async getOverdueStudents() {
    // Placeholder - implement with actual student data
    return []
  }

  async notifyFundTargetReached(fundType, fund) {
    console.log(`🎉 Community fund target reached: ${fund.name} - K${fund.current}`)
  }

  async notifyGuarantor(guarantorPhone, loan) {
    const message = `You are requested to guarantee a loan of K${loan.amount} for ${loan.applicantName}. Reply YES to confirm.`
    
    if (window.smsSystem) {
      await window.smsSystem.sendSMS(guarantorPhone, message, 'loan_guarantee', 'high')
    }
  }
}

// Export singleton instance
export const mobileMoneySystem = new MobileMoneySystem()
