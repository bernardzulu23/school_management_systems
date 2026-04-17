import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Check, AlertCircle, Eye, EyeOff } from 'lucide-react'

const FormField = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  validate,
  className = '',
  description,
  disabled = false,
  icon: Icon,
  children,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [localError, setLocalError] = useState('')
  const [isDebouncing, setIsDebouncing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (validate && value !== undefined && value !== '') {
      setIsDebouncing(true)
      const timer = setTimeout(() => {
        const validationResult = validate(value)
        if (validationResult === true) {
          setIsValid(true)
          setLocalError('')
        } else {
          setIsValid(false)
          setLocalError(validationResult || 'Invalid input')
        }
        setIsDebouncing(false)
      }, 500) // 500ms debounce

      return () => clearTimeout(timer)
    } else {
      setIsValid(false)
      setLocalError('')
    }
  }, [value, validate])

  const displayError = error || localError
  const showSuccess = isValid && !displayError && !isDebouncing && value
  const isPasswordField = type === 'password'
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'text-sm font-medium transition-colors duration-200',
            displayError
              ? 'text-royalPurple-dangerTx'
              : isFocused
                ? 'text-royalPurple-accentTx'
                : 'text-royalPurple-text2'
          )}
        >
          {label}
          {required && <span className="text-royalPurple-dangerTx ml-1">*</span>}
        </label>
      )}

      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                displayError
                  ? 'text-royalPurple-dangerTx'
                  : isFocused
                    ? 'text-royalPurple-text2'
                    : 'text-royalPurple-text3'
              )}
            />
          </div>
        )}

        {type === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={props.rows || 3}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted transition-colors duration-200 outline-none resize-none',
              Icon && 'pl-10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              displayError
                ? 'border-royalPurple-dangerTx focus:ring-1 focus:ring-royalPurple-border2'
                : showSuccess
                  ? 'border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2'
                  : 'focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2',
              className
            )}
            aria-invalid={!!displayError}
            aria-describedby={description ? `${name}-description` : undefined}
            {...props}
          />
        ) : type === 'select' ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted transition-colors duration-200 outline-none appearance-none',
              Icon && 'pl-10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              displayError
                ? 'border-royalPurple-dangerTx focus:ring-1 focus:ring-royalPurple-border2'
                : showSuccess
                  ? 'border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2'
                  : 'focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2',
              className
            )}
            aria-invalid={!!displayError}
            aria-describedby={description ? `${name}-description` : undefined}
            {...props}
          >
            {children}
          </select>
        ) : (
          <input
            id={name}
            name={name}
            type={inputType}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted transition-colors duration-200 outline-none',
              Icon && 'pl-10',
              isPasswordField && 'pr-11',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              displayError
                ? 'border-royalPurple-dangerTx focus:ring-1 focus:ring-royalPurple-border2'
                : showSuccess
                  ? 'border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2'
                  : 'focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2',
              className
            )}
            aria-invalid={!!displayError}
            aria-describedby={description ? `${name}-description` : undefined}
            {...props}
          />
        )}

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
          {isDebouncing && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-royalPurple-border border-t-royalPurple-accent" />
          )}
          {showSuccess && (
            <Check className="h-5 w-5 text-royalPurple-successTx" aria-hidden="true" />
          )}
          {displayError && (
            <AlertCircle className="h-5 w-5 text-royalPurple-dangerTx" aria-hidden="true" />
          )}
          {type === 'select' && (
            <svg
              className="h-5 w-5 text-royalPurple-text3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>

      {description && !displayError && (
        <p id={`${name}-description`} className="text-xs text-royalPurple-text2">
          {description}
        </p>
      )}

      {displayError && (
        <p className="text-xs font-medium text-royalPurple-dangerTx animate-in fade-in slide-in-from-top-1">
          {displayError}
        </p>
      )}
    </div>
  )
}

export const FormGroup = ({ children, className = '' }) => (
  <div className={cn('space-y-4', className)}>{children}</div>
)

export default FormField
