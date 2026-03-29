import { forwardRef } from 'react'

// Utility function to merge classes
const cn = (...classes) => classes.filter(Boolean).join(' ')

const Card = forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const variants = {
    default:
      'bg-white dark:bg-g-800 rounded-[14px] border border-black/[0.09] dark:border-white/[0.09] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)]',
    dashboard:
      'bg-white dark:bg-g-800 rounded-[14px] border border-black/[0.09] dark:border-white/[0.09] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)] p-6',
    stats:
      'bg-white dark:bg-g-800 rounded-[14px] border border-black/[0.09] dark:border-white/[0.09] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)] p-4',
    solid:
      'bg-white dark:bg-g-800 rounded-[14px] border border-black/[0.09] dark:border-white/[0.09] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)]',
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
      'text-lg font-semibold leading-none tracking-tight text-g-900 dark:text-g-50',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef(({ className = '', ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-g-700 dark:text-g-300', className)} {...props} />
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
