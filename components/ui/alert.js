import React from 'react'

export function Alert({ children, variant = 'default', className = '' }) {
  const baseClasses = 'relative w-full rounded-lg border p-4'
  const variantClasses = {
    default: 'bg-white border-gray-200 text-gray-900',
    destructive: 'border-red-200 text-red-800 bg-red-50',
    warning: 'border-yellow-200 text-yellow-800 bg-yellow-50',
    success: 'border-green-200 text-green-800 bg-green-50',
    info: 'border-blue-200 text-blue-800 bg-blue-50'
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}>
      {children}
    </div>
  )
}

export function AlertDescription({ children, className = '' }) {
  return (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>
      {children}
    </div>
  )
}

export function AlertTitle({ children, className = '' }) {
  return (
    <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>
      {children}
    </h5>
  )
}
