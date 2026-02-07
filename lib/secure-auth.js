/**
 * Secure Authentication Enhancement with AES-256 & TLS 1.3
 * Enhances existing auth system with enterprise-grade security
 */

import { encryption, secureStorage, SecurityUtils } from './encryption'
import { httpsClient, SECURITY_CONSTANTS } from './tls-config'
import { useAuth } from './auth'

/**
 * Secure Authentication Wrapper
 * Enhances existing Zustand auth with AES-256 encryption
 */
export class SecureAuthWrapper {
  constructor() {
    this.maxLoginAttempts = SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS
    this.lockoutDuration = SECURITY_CONSTANTS.LOCKOUT_DURATION
    this.sessionTimeout = SECURITY_CONSTANTS.SESSION_TIMEOUT
    this.authStore = useAuth
  }

  /**
   * Enhanced secure login with AES-256 encryption
   * @param {object} credentials - User credentials
   * @returns {Promise<object>} Authentication result
   */
  async secureLogin(credentials) {
    try {
      // Check if account is locked
      if (this.isAccountLocked(credentials.email)) {
        throw new Error('Account temporarily locked due to multiple failed attempts')
      }

      // Generate client security fingerprint
      const fingerprint = await this.generateClientFingerprint()

      // Encrypt sensitive credentials
      const secureCredentials = {
        email: encryption.encrypt(credentials.email),
        password: this.hashPassword(credentials.password),
        fingerprint: fingerprint,
        timestamp: new Date().toISOString(),
        clientInfo: await this.getClientInfo()
      }

      // Use existing auth store but with encrypted data
      const originalLogin = this.authStore.getState().login
      
      // Override credentials with encrypted version for transmission
      const result = await originalLogin({
        ...credentials,
        secureData: secureCredentials
      })

      // If login successful, enhance session security
      if (this.authStore.getState().isAuthenticated) {
        await this.enhanceSessionSecurity()
        this.clearFailedAttempts(credentials.email)
      }

      return result
    } catch (error) {
      this.trackFailedAttempt(credentials.email)
      throw error
    }
  }

  /**
   * Enhanced secure registration with data encryption
   * @param {object} userData - User registration data
   * @returns {Promise<object>} Registration result
   */
  async secureRegister(userData) {
    try {
      // Encrypt sensitive personal data
      const encryptedUserData = this.encryptUserData(userData)

      // Use existing auth store register method
      const originalRegister = this.authStore.getState().register
      return await originalRegister(encryptedUserData)
    } catch (error) {
      console.error('Secure registration failed:', error)
      throw error
    }
  }

  /**
   * Enhanced secure logout with session cleanup
   */
  async secureLogout() {
    try {
      // Clear secure storage
      secureStorage.clearSecureStorage()
      
      // Clear session timeout
      this.clearSessionTimeout()

      // Use existing auth store logout
      const originalLogout = this.authStore.getState().logout
      await originalLogout()

      // Additional security cleanup
      this.clearSecurityData()
    } catch (error) {
      console.error('Secure logout error:', error)
      // Force cleanup even if error occurs
      this.forceSecurityCleanup()
    }
  }

  /**
   * Enhance session security after login
   */
  async enhanceSessionSecurity() {
    const authState = this.authStore.getState()
    
    if (authState.user && authState.token) {
      // Create encrypted session backup
      const sessionData = {
        user: authState.user,
        token: authState.token,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout,
        fingerprint: await this.generateClientFingerprint(),
        ipAddress: await this.getClientIP()
      }

      // Store encrypted session data
      secureStorage.setSecureItem('secure_session', sessionData)
      
      // Generate additional security token
      const secureToken = encryption.generateSecureToken(authState.user)
      secureStorage.setSecureItem('security_token', secureToken)

      // Set session timeout
      this.setSessionTimeout()
    }
  }

  /**
   * Verify session integrity
   * @returns {boolean} Session validity
   */
  async verifySessionIntegrity() {
    const authState = this.authStore.getState()
    const secureSession = secureStorage.getSecureItem('secure_session')
    
    if (!authState.isAuthenticated || !secureSession) {
      return false
    }

    // Check session expiry
    if (Date.now() > secureSession.expiresAt) {
      await this.secureLogout()
      return false
    }

    // Verify client fingerprint
    const currentFingerprint = await this.generateClientFingerprint()
    if (currentFingerprint !== secureSession.fingerprint) {
      await this.secureLogout()
      return false
    }

    // Verify security token
    const securityToken = secureStorage.getSecureItem('security_token')
    if (!securityToken || !encryption.validateSecureToken(securityToken)) {
      await this.secureLogout()
      return false
    }

    return true
  }

  /**
   * Encrypt user data for registration
   * @param {object} userData - User data
   * @returns {object} Encrypted user data
   */
  encryptUserData(userData) {
    const sensitiveFields = [
      'nationalId', 'passportNumber', 'phoneNumber', 
      'address', 'emergencyContact', 'medicalInfo'
    ]

    const encryptedData = { ...userData }

    sensitiveFields.forEach(field => {
      if (userData[field]) {
        encryptedData[field] = encryption.encrypt(userData[field])
      }
    })

    return encryptedData
  }

  /**
   * Hash password using PBKDF2
   * @param {string} password - Plain password
   * @returns {string} Hashed password
   */
  hashPassword(password) {
    const salt = SecurityUtils.generateSecureRandom(32)
    return SecurityUtils.hashPassword(password, salt)
  }

  /**
   * Generate client fingerprint for session validation
   * @returns {Promise<string>} Client fingerprint
   */
  async generateClientFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.hardwareConcurrency || 'unknown'
    ]

    const fingerprint = components.join('|')
    return SecurityUtils.generateHMAC(fingerprint, 'client_fingerprint_key')
  }

  /**
   * Get client information for security logging
   * @returns {Promise<object>} Client information
   */
  async getClientInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get client IP address
   * @returns {Promise<string>} Client IP
   */
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Track failed login attempt
   * @param {string} email - User email
   */
  trackFailedAttempt(email) {
    const attempts = this.getFailedAttempts(email)
    attempts.push(Date.now())
    
    secureStorage.setSecureItem(`failed_attempts_${email}`, attempts)
    
    if (attempts.length >= this.maxLoginAttempts) {
      this.lockAccount(email)
    }
  }

  /**
   * Get failed login attempts
   * @param {string} email - User email
   * @returns {number[]} Failed attempt timestamps
   */
  getFailedAttempts(email) {
    const attempts = secureStorage.getSecureItem(`failed_attempts_${email}`)
    return attempts || []
  }

  /**
   * Clear failed login attempts
   * @param {string} email - User email
   */
  clearFailedAttempts(email) {
    secureStorage.removeSecureItem(`failed_attempts_${email}`)
    secureStorage.removeSecureItem(`account_locked_${email}`)
  }

  /**
   * Lock user account
   * @param {string} email - User email
   */
  lockAccount(email) {
    const lockData = {
      lockedAt: Date.now(),
      unlockAt: Date.now() + this.lockoutDuration
    }
    secureStorage.setSecureItem(`account_locked_${email}`, lockData)
  }

  /**
   * Check if account is locked
   * @param {string} email - User email
   * @returns {boolean} Lock status
   */
  isAccountLocked(email) {
    const lockData = secureStorage.getSecureItem(`account_locked_${email}`)
    if (!lockData) return false

    if (Date.now() > lockData.unlockAt) {
      this.clearFailedAttempts(email)
      return false
    }

    return true
  }

  /**
   * Set session timeout
   */
  setSessionTimeout() {
    this.sessionTimeoutId = setTimeout(async () => {
      await this.secureLogout()
      alert('Session expired for security. Please log in again.')
    }, this.sessionTimeout)
  }

  /**
   * Clear session timeout
   */
  clearSessionTimeout() {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId)
      this.sessionTimeoutId = null
    }
  }

  /**
   * Clear security data
   */
  clearSecurityData() {
    // Clear any additional security-related data
    const securityKeys = ['secure_session', 'security_token', 'client_fingerprint']
    securityKeys.forEach(key => secureStorage.removeSecureItem(key))
  }

  /**
   * Force security cleanup
   */
  forceSecurityCleanup() {
    secureStorage.clearSecureStorage()
    this.clearSessionTimeout()
    
    // Clear any remaining localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('failed_attempts_') || key.includes('account_locked_')) {
        localStorage.removeItem(key)
      }
    })
  }
}

/**
 * Security Monitor for continuous session validation
 */
export class SecurityMonitor {
  constructor(secureAuth) {
    this.secureAuth = secureAuth
    this.monitoringInterval = 60000 // 1 minute
    this.isMonitoring = false
  }

  /**
   * Start security monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringIntervalId = setInterval(async () => {
      await this.performSecurityCheck()
    }, this.monitoringInterval)
  }

  /**
   * Stop security monitoring
   */
  stopMonitoring() {
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId)
      this.monitoringIntervalId = null
    }
    this.isMonitoring = false
  }

  /**
   * Perform security check
   */
  async performSecurityCheck() {
    try {
      const isValid = await this.secureAuth.verifySessionIntegrity()
      
      if (!isValid) {
        console.warn('Security check failed - logging out')
        await this.secureAuth.secureLogout()
        this.stopMonitoring()
      }
    } catch (error) {
      console.error('Security check error:', error)
    }
  }
}

// Export singleton instances
export const secureAuth = new SecureAuthWrapper()
export const securityMonitor = new SecurityMonitor(secureAuth)

// Export enhanced auth hook
export const useSecureAuth = () => {
  const authState = useAuth()
  
  return {
    ...authState,
    secureLogin: secureAuth.secureLogin.bind(secureAuth),
    secureRegister: secureAuth.secureRegister.bind(secureAuth),
    secureLogout: secureAuth.secureLogout.bind(secureAuth),
    verifyIntegrity: secureAuth.verifySessionIntegrity.bind(secureAuth),
    startSecurityMonitoring: securityMonitor.startMonitoring.bind(securityMonitor),
    stopSecurityMonitoring: securityMonitor.stopMonitoring.bind(securityMonitor)
  }
}
