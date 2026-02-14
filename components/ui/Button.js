import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Button = forwardRef(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseClasses = 'btn'

    const variants = {
      primary: 'btn-primary min-h-[44px]',
      secondary: 'btn-secondary min-h-[44px]',
      outline: 'btn-outline min-h-[44px]',
      ghost: 'btn-ghost min-h-[44px]',
      destructive: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl min-h-[44px] py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105',
    }

    const sizes = {
      sm: 'h-10 px-4 text-xs', // Increased from h-9 to h-10 for better touch target (40px)
      md: 'h-11 px-6',
      lg: 'h-14 px-8 text-base',
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
