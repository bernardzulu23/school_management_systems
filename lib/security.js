/**
 * Frontend Security Utilities
 * Provides client-side security functions for input validation and sanitization
 */

import { AES256Encryption } from './encryption'
import CryptoJS from 'crypto-js'
import { evaluatePassword } from './security/passwordValidate'

/**
 * Escape HTML special characters (safe for SSR)
 * @param {string} input - The input string to escape
 * @returns {string} - Escaped string
 */
export function escapeHtml(input) {
  if (typeof input !== 'string') return input

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return input.replace(/[&<>"'/]/g, (s) => map[s])
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses dompurify in browser; falls back to escapeHtml on server (SSR)
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return input

  if (typeof window === 'undefined') {
    return escapeHtml(input)
  }

  const DOMPurify = require('dompurify')
  const purify = DOMPurify.default || DOMPurify
  return purify.sanitize(input)
}

const encryption = new AES256Encryption()

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Validate password strength (aligned with server-side passwordPolicy).
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with score and requirements
 */
export function validatePasswordStrength(password) {
  const { requirements, isValid } = evaluatePassword(password)
  const score = Object.values(requirements).filter(Boolean).length
  const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'

  return {
    score,
    strength,
    requirements: {
      minLength: requirements.minLength,
      hasUppercase: requirements.hasUppercase,
      hasLowercase: requirements.hasLowercase,
      hasNumbers: requirements.hasNumber,
      hasSpecialChars: requirements.hasSpecial,
    },
    isValid,
  }
}

/**
 * Check for potentially dangerous patterns in input
 * @param {string} input - Input to check
 * @returns {boolean} - True if dangerous patterns found
 */
export function containsDangerousPatterns(input) {
  if (typeof input !== 'string') return false

  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
    /import\s*\(/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /<style/gi,
  ]

  return dangerousPatterns.some((pattern) => pattern.test(input))
}

/**
 * Sanitize form input data
 * @param {object} formData - Form data object
 * @returns {object} - Sanitized form data
 */
export function sanitizeFormData(formData) {
  const sanitized = {}

  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      // Remove dangerous patterns
      if (containsDangerousPatterns(value)) {
        console.warn(`Dangerous pattern detected in field: ${key}`)
        sanitized[key] = sanitizeHtml(value)
      } else {
        sanitized[key] = value.trim()
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeHtml(item.trim()) : item
      )
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,20}$/
  return phoneRegex.test(phone)
}

/**
 * Validate name format (letters, spaces, hyphens, apostrophes only)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid name format
 */
export function isValidName(name) {
  const nameRegex = /^[a-zA-Z\s\-\'\.]+$/
  return nameRegex.test(name)
}

/**
 * Generate a secure random token
 * @param {number} length - Length of the token
 * @returns {string} - Random token
 */
export function generateSecureToken(length = 32) {
  const bytes = Math.ceil(length / 2)
  return CryptoJS.lib.WordArray.random(bytes).toString(CryptoJS.enc.Hex).slice(0, length)
}

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @param {object} options - Validation options
 * @returns {object} - Validation result
 */
export function validateFile(file, options = {}) {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxSize = 5 * 1024 * 1024, // 5MB
  } = options

  const errors = []

  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed')
  }

  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Create Content Security Policy meta tag (legacy client helper — prefer server nonce CSP).
 * @returns {HTMLMetaElement}
 */
export function createCSPMetaTag(nonce) {
  const scriptParts = ["'self'"]
  if (nonce) {
    scriptParts.push(`'nonce-${nonce}'`, "'strict-dynamic'")
  }

  const csp = [
    "default-src 'self'",
    `script-src ${scriptParts.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = csp

  return meta
}

/**
 * Secure localStorage wrapper with encryption
 */
export const secureStorage = {
  /**
   * Set item in localStorage with AES-256 encryption
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setItem(key, value) {
    if (typeof window === 'undefined') return
    try {
      const serialized = JSON.stringify(value)
      const encrypted = encryption.encrypt(serialized)
      localStorage.setItem(key, JSON.stringify(encrypted))
    } catch (error) {
      console.error('Error storing data:', error)
    }
  },

  /**
   * Get item from localStorage with AES-256 decryption
   * Supports legacy Base64 data migration
   * @param {string} key - Storage key
   * @returns {any} - Stored value or null
   */
  getItem(key) {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null

      try {
        // Try parsing as new encrypted JSON format
        const parsed = JSON.parse(raw)
        if (parsed.ciphertext && parsed.iv) {
          const decrypted = encryption.decrypt(parsed)
          return JSON.parse(decrypted)
        }
      } catch (e) {
        try {
          localStorage.removeItem(key)
        } catch {}
      }

      // Legacy Base64 fallback
      try {
        const serialized = atob(raw)
        return JSON.parse(serialized)
      } catch (e) {
        console.error('Legacy decryption failed:', e)
        try {
          localStorage.removeItem(key)
        } catch {}
        return null
      }
    } catch (error) {
      console.error('Error retrieving data:', error)
      try {
        localStorage.removeItem(key)
      } catch {}
      return null
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },

  /**
   * Clear all items from localStorage
   */
  clear() {
    if (typeof window === 'undefined') return
    localStorage.clear()
  },
}

/**
 * Rate limiting utility for client-side requests
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = []
  }

  /**
   * Check if request is allowed
   * @returns {boolean} - True if request is allowed
   */
  isAllowed() {
    const now = Date.now()

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs)

    // Check if we're under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now)
      return true
    }

    return false
  }

  /**
   * Get time until next request is allowed
   * @returns {number} - Milliseconds until next request
   */
  getTimeUntilReset() {
    if (this.requests.length === 0) return 0

    const oldestRequest = Math.min(...this.requests)
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest)

    return Math.max(0, timeUntilReset)
  }
}
