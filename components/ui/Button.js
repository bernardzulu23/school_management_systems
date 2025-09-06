import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Button = forwardRef(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseClasses = 'btn'

    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      destructive: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl h-11 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105',
    }

    const sizes = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    }

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
