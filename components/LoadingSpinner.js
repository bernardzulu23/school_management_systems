import React from 'react'

const LoadingSpinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  }

  const colors = {
    primary: 'border-royalPurple-border2',
    secondary: 'border-royalPurple-border',
    white: 'border-white',
    success: 'border-royalPurple-border',
    danger: 'border-royalPurple-border',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          animate-spin rounded-full 
          border-t-transparent 
          ${sizes[size] || sizes.md} 
          ${colors[color] || colors.primary}
        `}
        role="status"
        aria-label="loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

export default LoadingSpinner
