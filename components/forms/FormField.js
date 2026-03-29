import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Check, AlertCircle } from 'lucide-react'

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

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'text-sm font-medium transition-colors duration-200',
            displayError ? 'text-[#b91c1c]' : isFocused ? 'text-g-800' : 'text-g-700'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                displayError ? 'text-[#b91c1c]' : isFocused ? 'text-g-700' : 'text-g-400'
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
              'w-full px-4 py-2.5 rounded-[10px] border bg-white dark:bg-g-800 text-g-900 dark:text-g-50 placeholder:text-g-400 transition-all duration-200 outline-none resize-none',
              Icon && 'pl-10',
              'disabled:bg-g-50 disabled:text-g-600 disabled:cursor-not-allowed',
              displayError
                ? 'border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                : showSuccess
                  ? 'border-[#0d7a4c] focus:ring-1 focus:ring-[#0d7a4c]'
                  : 'border-g-200 focus:border-g-600 focus:ring-1 focus:ring-g-600',
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
              'w-full px-4 py-2.5 rounded-[10px] border bg-white dark:bg-g-800 text-g-900 dark:text-g-50 placeholder:text-g-400 transition-all duration-200 outline-none appearance-none',
              Icon && 'pl-10',
              'disabled:bg-g-50 disabled:text-g-600 disabled:cursor-not-allowed',
              displayError
                ? 'border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                : showSuccess
                  ? 'border-[#0d7a4c] focus:ring-1 focus:ring-[#0d7a4c]'
                  : 'border-g-200 focus:border-g-600 focus:ring-1 focus:ring-g-600',
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
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-4 py-2.5 rounded-[10px] border bg-white dark:bg-g-800 text-g-900 dark:text-g-50 placeholder:text-g-400 transition-all duration-200 outline-none',
              Icon && 'pl-10',
              'disabled:bg-g-50 disabled:text-g-600 disabled:cursor-not-allowed',
              displayError
                ? 'border-[#b91c1c] focus:ring-1 focus:ring-[#b91c1c]'
                : showSuccess
                  ? 'border-[#0d7a4c] focus:ring-1 focus:ring-[#0d7a4c]'
                  : 'border-g-200 focus:border-g-600 focus:ring-1 focus:ring-g-600',
              className
            )}
            aria-invalid={!!displayError}
            aria-describedby={description ? `${name}-description` : undefined}
            {...props}
          />
        )}

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 pointer-events-none">
          {isDebouncing && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-g-700 border-t-transparent" />
          )}
          {showSuccess && <Check className="h-5 w-5 text-green-500" />}
          {displayError && <AlertCircle className="h-5 w-5 text-red-500" />}
          {type === 'select' && (
            <svg
              className="h-5 w-5 text-g-400"
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
        <p id={`${name}-description`} className="text-xs text-g-600 dark:text-g-300">
          {description}
        </p>
      )}

      {displayError && (
        <p className="text-xs font-medium text-[#b91c1c] animate-in fade-in slide-in-from-top-1">
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
