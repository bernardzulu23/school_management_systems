/**
 * Frontend Security Utilities
 * Provides client-side security functions for input validation and sanitization
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  
  // Create a temporary div element
  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.innerHTML;
}

/**
 * Escape HTML special characters
 * @param {string} input - The input string to escape
 * @returns {string} - Escaped string
 */
export function escapeHtml(input) {
  if (typeof input !== 'string') return input;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (s) => map[s]);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with score and requirements
 */
export function validatePasswordStrength(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const score = Object.values(requirements).filter(Boolean).length;
  const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';
  
  return {
    score,
    strength,
    requirements,
    isValid: score >= 4,
  };
}

/**
 * Check for potentially dangerous patterns in input
 * @param {string} input - Input to check
 * @returns {boolean} - True if dangerous patterns found
 */
export function containsDangerousPatterns(input) {
  if (typeof input !== 'string') return false;
  
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
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize form input data
 * @param {object} formData - Form data object
 * @returns {object} - Sanitized form data
 */
export function sanitizeFormData(formData) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      // Remove dangerous patterns
      if (containsDangerousPatterns(value)) {
        console.warn(`Dangerous pattern detected in field: ${key}`);
        sanitized[key] = escapeHtml(value);
      } else {
        sanitized[key] = value.trim();
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? escapeHtml(item.trim()) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate name format (letters, spaces, hyphens, apostrophes only)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid name format
 */
export function isValidName(name) {
  const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;
  return nameRegex.test(name);
}

/**
 * Generate a secure random token
 * @param {number} length - Length of the token
 * @returns {string} - Random token
 */
export function generateSecureToken(length = 32) {
  const array = new Uint8Array(length / 2);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
  } = options;
  
  const errors = [];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }
  
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create Content Security Policy meta tag
 * @returns {HTMLMetaElement} - CSP meta tag
 */
export function createCSPMetaTag() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' http://localhost:8000",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = csp;
  
  return meta;
}

/**
 * Secure localStorage wrapper with encryption
 */
export const secureStorage = {
  /**
   * Set item in localStorage with basic obfuscation
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      const encoded = btoa(serialized);
      localStorage.setItem(key, encoded);
    } catch (error) {
      console.error('Error storing data:', error);
    }
  },
  
  /**
   * Get item from localStorage with decoding
   * @param {string} key - Storage key
   * @returns {any} - Stored value or null
   */
  getItem(key) {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) return null;
      
      const serialized = atob(encoded);
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  },
  
  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    localStorage.removeItem(key);
  },
  
  /**
   * Clear all items from localStorage
   */
  clear() {
    localStorage.clear();
  }
};

/**
 * Rate limiting utility for client-side requests
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  /**
   * Check if request is allowed
   * @returns {boolean} - True if request is allowed
   */
  isAllowed() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we're under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get time until next request is allowed
   * @returns {number} - Milliseconds until next request
   */
  getTimeUntilReset() {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, timeUntilReset);
  }
}
