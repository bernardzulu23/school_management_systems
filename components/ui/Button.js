import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Button = forwardRef(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] rounded-[10px]'

    const variants = {
      default: 'bg-g-800 text-white hover:bg-g-900 min-h-[44px]',
      primary: 'bg-g-800 text-white hover:bg-g-900 min-h-[44px]',
      secondary:
        'bg-white dark:bg-g-800 border border-g-300 text-g-700 dark:text-g-100 hover:bg-g-100 dark:hover:bg-g-700 min-h-[44px]',
      outline:
        'bg-transparent border border-g-300 text-g-700 dark:text-g-100 hover:bg-g-100 dark:hover:bg-g-800 min-h-[44px]',
      ghost:
        'bg-transparent text-g-700 dark:text-g-100 hover:bg-g-100 dark:hover:bg-g-800 min-h-[44px]',
      destructive: 'bg-[#b91c1c] text-white hover:bg-[#991b1b] min-h-[44px]',
    }

    const sizes = {
      sm: 'h-10 px-4 text-xs',
      md: 'h-11 px-6 text-sm',
      lg: 'h-12 px-8 text-base',
    }

    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
