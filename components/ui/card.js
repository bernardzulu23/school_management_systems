import { forwardRef } from 'react'

// Utility function to merge classes
const cn = (...classes) => classes.filter(Boolean).join(' ')

const Card = forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-royalPurple-card border border-royalPurple-border rounded-xl',
    dashboard: 'bg-royalPurple-card border border-royalPurple-border rounded-xl p-6',
    stats: 'bg-royalPurple-card border border-royalPurple-border rounded-xl p-4',
    solid: 'bg-royalPurple-card border border-royalPurple-border rounded-xl',
  }

  return (
    <div ref={ref} className={cn(variants[variant] || variants.default, className)} {...props} />
  )
})
Card.displayName = 'Card'

const CardHeader = forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({ className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-royalPurple-text1',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef(({ className = '', ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-royalPurple-text2', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
