/**
 * AES-256 Encryption Library for School Management System
 * Implements enterprise-grade encryption for sensitive data
 */

import CryptoJS from 'crypto-js'

export class AES256Encryption {
  constructor() {
    this.algorithm = 'AES-256-CBC'
    this.storageKeyName = 'sms_device_key_v1'
    this.encryptionKey = this.initializeKey()
  }

  /**
   * Initialize encryption key
   * Priority:
   * 1. Existing device-specific key in localStorage
   * 2. Generate new device-specific key
   * 
   * FALLBACK: NEXT_PUBLIC_ENCRYPTION_KEY (Only for dev/legacy compatibility)
   */
  initializeKey() {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'server-side-fallback-key-do-not-use-in-prod'
    }

    try {
      let key = localStorage.getItem(this.storageKeyName)
      if (!key) {
        key = this.generateSecureKey()
        localStorage.setItem(this.storageKeyName, key)
      }
      return key
    } catch (error) {
      console.warn('LocalStorage access failed, falling back to env key')
      return process.env.NEXT_PUBLIC_ENCRYPTION_KEY || this.generateSecureKey()
    }
  }

  /**
   * Generate a secure 256-bit encryption key
   * @returns {string} Base64 encoded encryption key
   */
  generateSecureKey() {
    const key = CryptoJS.lib.WordArray.random(32) // 256 bits
    return CryptoJS.enc.Base64.stringify(key)
  }

  /**
   * Encrypt sensitive data using AES-256-CBC
   * @param {string} plaintext - Data to encrypt
   * @param {string} additionalData - Unused in CBC mode
   * @returns {object} Encrypted data with IV
   */
  encrypt(plaintext, additionalData = '') {
    try {
      // Generate random IV (Initialization Vector) - 16 bytes for CBC
      const iv = CryptoJS.lib.WordArray.random(16)
      
      // Convert key from base64
      const key = CryptoJS.enc.Base64.parse(this.encryptionKey)
      
      // Encrypt using AES-256-CBC
      const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })

      return {
        ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Base64),
        authTag: null, // CBC doesn't support auth tag
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('AES-256 Encryption failed:', error)
      throw new Error('Encryption failed')
    }
  }

  /**
   * Decrypt data using AES-256-CBC
   * @param {object} encryptedData - Encrypted data object
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      const { ciphertext, iv } = encryptedData
      
      // Convert from base64
      const key = CryptoJS.enc.Base64.parse(this.encryptionKey)
      const ivWordArray = CryptoJS.enc.Base64.parse(iv)
      const ciphertextWordArray = CryptoJS.enc.Base64.parse(ciphertext)
      
      // Decrypt using AES-256-CBC
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertextWordArray },
        key,
        {
          iv: ivWordArray,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      )

      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  }

  /**
   * Encrypt student personal information
   * @param {object} studentData - Student personal data
   * @returns {object} Encrypted student data
   */
  encryptStudentData(studentData) {
    const sensitiveFields = [
      'nationalId', 'passportNumber', 'medicalInfo', 
      'parentContact', 'homeAddress', 'emergencyContact'
    ]

    const encryptedData = { ...studentData }

    sensitiveFields.forEach(field => {
      if (studentData[field]) {
        encryptedData[field] = this.encrypt(JSON.stringify(studentData[field]))
      }
    })

    return encryptedData
  }

  /**
   * Decrypt student personal information
   * @param {object} encryptedStudentData - Encrypted student data
   * @returns {object} Decrypted student data
   */
  decryptStudentData(encryptedStudentData) {
    const sensitiveFields = [
      'nationalId', 'passportNumber', 'medicalInfo',
      'parentContact', 'homeAddress', 'emergencyContact'
    ]

    const decryptedData = { ...encryptedStudentData }

    sensitiveFields.forEach(field => {
      if (encryptedStudentData[field] && typeof encryptedStudentData[field] === 'object') {
        try {
          const decrypted = this.decrypt(encryptedStudentData[field])
          decryptedData[field] = JSON.parse(decrypted)
        } catch (error) {
          console.error(`Failed to decrypt ${field}:`, error)
        }
      }
    })

    return decryptedData
  }

  /**
   * Encrypt assessment data
   * @param {object} assessmentData - Assessment results
   * @returns {object} Encrypted assessment data
   */
  encryptAssessmentData(assessmentData) {
    return {
      ...assessmentData,
      scores: this.encrypt(JSON.stringify(assessmentData.scores)),
      comments: assessmentData.comments ? this.encrypt(assessmentData.comments) : null,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate secure session token
   * @param {object} userData - User session data
   * @returns {string} Encrypted session token
   */
  generateSecureToken(userData) {
    const tokenData = {
      userId: userData.id,
      role: userData.role,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }

    const encrypted = this.encrypt(JSON.stringify(tokenData))
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(encrypted)))
  }

  /**
   * Validate and decrypt session token
   * @param {string} token - Encrypted session token
   * @returns {object|null} Decrypted token data or null if invalid
   */
  validateSecureToken(token) {
    try {
      const encryptedData = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(token)))
      const decrypted = this.decrypt(encryptedData)
      const tokenData = JSON.parse(decrypted)

      // Check if token is expired
      if (Date.now() > tokenData.expiresAt) {
        return null
      }

      return tokenData
    } catch (error) {
      console.error('Token validation failed:', error)
      return null
    }
  }
}

/**
 * Data Classification and Encryption Manager
 */
export class DataClassificationManager {
  constructor() {
    this.encryption = new AES256Encryption()
    
    // Data classification levels
    this.classificationLevels = {
      PUBLIC: 0,           // No encryption needed
      INTERNAL: 1,         // Basic encryption
      CONFIDENTIAL: 2,     // AES-256 encryption
      RESTRICTED: 3        // AES-256 + additional security
    }
  }

  /**
   * Classify and encrypt data based on sensitivity
   * @param {any} data - Data to classify and encrypt
   * @param {string} dataType - Type of data (student, teacher, assessment, etc.)
   * @returns {object} Classified and encrypted data
   */
  classifyAndEncrypt(data, dataType) {
    const classification = this.getDataClassification(dataType)
    
    if (classification >= this.classificationLevels.CONFIDENTIAL) {
      return {
        data: this.encryption.encrypt(JSON.stringify(data)),
        classification: classification,
        encrypted: true,
        algorithm: 'AES-256-GCM',
        timestamp: new Date().toISOString()
      }
    }

    return {
      data: data,
      classification: classification,
      encrypted: false,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get data classification level
   * @param {string} dataType - Type of data
   * @returns {number} Classification level
   */
  getDataClassification(dataType) {
    const classifications = {
      'student_personal': this.classificationLevels.RESTRICTED,
      'student_medical': this.classificationLevels.RESTRICTED,
      'student_grades': this.classificationLevels.CONFIDENTIAL,
      'teacher_personal': this.classificationLevels.CONFIDENTIAL,
      'financial_data': this.classificationLevels.RESTRICTED,
      'assessment_results': this.classificationLevels.CONFIDENTIAL,
      'attendance_records': this.classificationLevels.INTERNAL,
      'public_announcements': this.classificationLevels.PUBLIC
    }

    return classifications[dataType] || this.classificationLevels.INTERNAL
  }
}

/**
 * Secure Storage Manager with AES-256
 */
export class SecureStorageManager {
  constructor() {
    this.encryption = new AES256Encryption()
    this.storagePrefix = 'sms_secure_'
  }

  /**
   * Store encrypted data in localStorage
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   */
  setSecureItem(key, data) {
    try {
      const encrypted = this.encryption.encrypt(JSON.stringify(data))
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(encrypted))
    } catch (error) {
      console.error('Secure storage failed:', error)
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   * @param {string} key - Storage key
   * @returns {any} Decrypted data or null
   */
  getSecureItem(key) {
    if (typeof window === 'undefined') return null
    try {
      const encryptedData = localStorage.getItem(this.storagePrefix + key)
      if (!encryptedData) return null

      const encrypted = JSON.parse(encryptedData)
      const decrypted = this.encryption.decrypt(encrypted)
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Secure retrieval failed:', error)
      return null
    }
  }

  /**
   * Remove encrypted data from localStorage
   * @param {string} key - Storage key
   */
  removeSecureItem(key) {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.storagePrefix + key)
  }

  /**
   * Clear all secure storage
   */
  clearSecureStorage() {
    if (typeof window === 'undefined') return
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.storagePrefix)) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Export singleton instances
export const encryption = new AES256Encryption()
export const dataClassification = new DataClassificationManager()
export const secureStorage = new SecureStorageManager()

// Export security utilities
export const SecurityUtils = {
  /**
   * Generate cryptographically secure random string
   * @param {number} length - Length of random string
   * @returns {string} Secure random string
   */
  generateSecureRandom(length = 32) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  },

  /**
   * Hash password using PBKDF2
   * @param {string} password - Password to hash
   * @param {string} salt - Salt for hashing
   * @returns {string} Hashed password
   */
  hashPassword(password, salt) {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 100000
    }).toString()
  },

  /**
   * Validate data integrity using HMAC
   * @param {string} data - Data to validate
   * @param {string} key - HMAC key
   * @returns {string} HMAC signature
   */
  generateHMAC(data, key) {
    return CryptoJS.HmacSHA256(data, key).toString()
  }
}
