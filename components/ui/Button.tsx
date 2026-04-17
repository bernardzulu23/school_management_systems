'use client'

import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { colors, spacing, radius } from '@/lib/design-tokens'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      children,
      disabled,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: radius.md,
      border: 'none',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      transition: 'all 200ms ease',
      outline: 'none',
      width: fullWidth ? '100%' : 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: '44px', // Maintaining min-height from original component
    }

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: colors.primary[600],
        color: 'white',
        ...baseStyles,
      },
      secondary: {
        backgroundColor: 'white',
        color: colors.gray[900],
        border: `1px solid ${colors.gray[300]}`,
        ...baseStyles,
      },
      outline: {
        backgroundColor: 'transparent',
        color: colors.gray[600],
        border: `1px solid ${colors.gray[300]}`,
        ...baseStyles,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: colors.primary[600],
        ...baseStyles,
      },
      destructive: {
        backgroundColor: colors.error,
        color: 'white',
        ...baseStyles,
      },
    }

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '6px 12px', fontSize: '14px', minHeight: '36px' },
      md: { padding: '10px 20px', fontSize: '16px', minHeight: '44px' },
      lg: { padding: '14px 28px', fontSize: '18px', minHeight: '52px' },
    }

    const combinedStyles: React.CSSProperties = {
      ...(variantStyles[variant] || variantStyles.primary),
      ...(sizeStyles[size] || sizeStyles.md),
      opacity: disabled || isLoading ? 0.6 : 1,
      ...style,
    }

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={className}
        style={combinedStyles}
        {...props}
      >
        {isLoading && <Loader2 size={18} className="animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
