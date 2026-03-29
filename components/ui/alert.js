import React from 'react'

export function Alert({ children, variant = 'default', className = '' }) {
  const baseClasses = 'relative w-full rounded-lg border p-4'
  const variantClasses = {
    default: 'bg-royalPurple-card border-royalPurple-border text-royalPurple-text1',
    destructive: 'bg-royalPurple-danger border-royalPurple-border text-royalPurple-dangerTx',
    warning: 'bg-royalPurple-accentBg border-royalPurple-accent text-royalPurple-accentTx',
    success: 'bg-royalPurple-success border-royalPurple-border text-royalPurple-successTx',
    info: 'bg-royalPurple-card2 border-royalPurple-border2 text-royalPurple-text1',
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
    >
      {children}
    </div>
  )
}

export function AlertDescription({ children, className = '' }) {
  return <div className={`text-sm [&_p]:leading-relaxed ${className}`}>{children}</div>
}

export function AlertTitle({ children, className = '' }) {
  return <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>{children}</h5>
}
