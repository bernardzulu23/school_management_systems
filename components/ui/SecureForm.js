'use client'

import { useState, useEffect } from 'react'
import { sanitizeFormData, containsDangerousPatterns, generateSecureToken } from '@/lib/security'
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react'

/**
 * Secure Form Component with built-in XSS protection and validation
 */
export default function SecureForm({ 
  children, 
  onSubmit, 
  className = '',
  enableCSRF = true,
  validateOnChange = true,
  showSecurityIndicator = true,
  ...props 
}) {
  const [csrfToken, setCsrfToken] = useState('')
  const [securityWarnings, setSecurityWarnings] = useState([])
  const [isSecure, setIsSecure] = useState(true)

  useEffect(() => {
    if (enableCSRF) {
      setCsrfToken(generateSecureToken())
    }
  }, [enableCSRF])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData.entries())
    
    // Sanitize form data
    const sanitizedData = sanitizeFormData(data)
    
    // Add CSRF token if enabled
    if (enableCSRF) {
      sanitizedData._token = csrfToken
    }
    
    // Check for security issues
    const warnings = validateFormSecurity(sanitizedData)
    setSecurityWarnings(warnings)
    
    if (warnings.length > 0) {
      setIsSecure(false)
      console.warn('Security warnings detected:', warnings)
      
      // Optionally block submission if critical issues found
      const criticalWarnings = warnings.filter(w => w.level === 'critical')
      if (criticalWarnings.length > 0) {
        alert('Security issue detected. Please review your input.')
        return
      }
    } else {
      setIsSecure(true)
    }
    
    // Call the original onSubmit handler
    if (onSubmit) {
      await onSubmit(sanitizedData, e)
    }
  }

  const handleInputChange = (e) => {
    if (!validateOnChange) return
    
    const { value } = e.target
    
    if (containsDangerousPatterns(value)) {
      setSecurityWarnings(prev => [
        ...prev.filter(w => w.field !== e.target.name),
        {
          field: e.target.name,
          message: 'Potentially dangerous content detected',
          level: 'warning'
        }
      ])
      setIsSecure(false)
    } else {
      setSecurityWarnings(prev => prev.filter(w => w.field !== e.target.name))
      setIsSecure(securityWarnings.length <= 1)
    }
  }

  const validateFormSecurity = (data) => {
    const warnings = []
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (containsDangerousPatterns(value)) {
          warnings.push({
            field: key,
            message: 'Potentially dangerous content detected',
            level: 'critical'
          })
        }
        
        // Check for excessively long input
        if (value.length > 10000) {
          warnings.push({
            field: key,
            message: 'Input exceeds maximum length',
            level: 'warning'
          })
        }
        
        // Check for suspicious patterns
        if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i.test(value)) {
          warnings.push({
            field: key,
            message: 'SQL-like patterns detected',
            level: 'critical'
          })
        }
      }
    })
    
    return warnings
  }

  return (
    <div className="relative">
      {showSecurityIndicator && (
        <SecurityIndicator 
          isSecure={isSecure} 
          warnings={securityWarnings} 
        />
      )}
      
      <form 
        onSubmit={handleSubmit}
        onChange={handleInputChange}
        className={`${className} ${!isSecure ? 'border-red-200 bg-red-50' : ''}`}
        {...props}
      >
        {enableCSRF && (
          <input 
            type="hidden" 
            name="_token" 
            value={csrfToken} 
          />
        )}
        
        {children}
        
        {securityWarnings.length > 0 && (
          <SecurityWarnings warnings={securityWarnings} />
        )}
      </form>
    </div>
  )
}

/**
 * Security Indicator Component
 */
function SecurityIndicator({ isSecure, warnings }) {
  return (
    <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-gray-50">
      {isSecure ? (
        <>
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            Form is secure
          </span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-700 font-medium">
            Security warnings detected ({warnings.length})
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Security Warnings Component
 */
function SecurityWarnings({ warnings }) {
  if (warnings.length === 0) return null
  
  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <h4 className="text-sm font-medium text-yellow-800">
          Security Warnings
        </h4>
      </div>
      
      <ul className="space-y-1">
        {warnings.map((warning, index) => (
          <li key={index} className="text-sm text-yellow-700">
            <strong>{warning.field}:</strong> {warning.message}
            {warning.level === 'critical' && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                Critical
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Secure Input Component with built-in validation
 */
export function SecureInput({ 
  type = 'text', 
  value, 
  onChange, 
  validateSecurity = true,
  className = '',
  ...props 
}) {
  const [hasWarning, setHasWarning] = useState(false)
  
  const handleChange = (e) => {
    const newValue = e.target.value
    
    if (validateSecurity && containsDangerousPatterns(newValue)) {
      setHasWarning(true)
    } else {
      setHasWarning(false)
    }
    
    if (onChange) {
      onChange(e)
    }
  }
  
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={handleChange}
        className={`
          ${className}
          ${hasWarning ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' : ''}
        `}
        {...props}
      />
      
      {hasWarning && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
      )}
    </div>
  )
}

/**
 * Secure Textarea Component
 */
export function SecureTextarea({ 
  value, 
  onChange, 
  validateSecurity = true,
  allowHtml = false,
  className = '',
  ...props 
}) {
  const [hasWarning, setHasWarning] = useState(false)
  
  const handleChange = (e) => {
    const newValue = e.target.value
    
    if (validateSecurity && !allowHtml && containsDangerousPatterns(newValue)) {
      setHasWarning(true)
    } else {
      setHasWarning(false)
    }
    
    if (onChange) {
      onChange(e)
    }
  }
  
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        className={`
          ${className}
          ${hasWarning ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' : ''}
        `}
        {...props}
      />
      
      {hasWarning && (
        <div className="absolute right-2 top-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
      )}
    </div>
  )
}
