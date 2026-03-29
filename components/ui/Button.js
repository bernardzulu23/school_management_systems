import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Button = forwardRef(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-semibold transition-colors duration-200 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] rounded-lg'

    const variants = {
      default:
        'bg-royalPurple-accent text-royalPurple-accentTx font-semibold hover:bg-royalPurple-accentBg min-h-[44px]',
      primary:
        'bg-royalPurple-accent text-royalPurple-accentTx font-semibold hover:bg-royalPurple-accentBg min-h-[44px]',
      secondary:
        'border border-royalPurple-border2 text-royalPurple-text2 hover:border-royalPurple-accent hover:text-royalPurple-accentTx min-h-[44px]',
      outline:
        'border border-royalPurple-border2 text-royalPurple-text2 hover:border-royalPurple-accent hover:text-royalPurple-accentTx min-h-[44px]',
      ghost: 'text-royalPurple-text2 hover:bg-royalPurple-card2 min-h-[44px]',
      destructive: 'bg-royalPurple-danger text-royalPurple-dangerTx min-h-[44px]',
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
