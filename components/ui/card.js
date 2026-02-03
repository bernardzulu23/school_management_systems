import { forwardRef } from 'react'

// Utility function to merge classes
const cn = (...classes) => classes.filter(Boolean).join(' ')

const Card = forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm',
    dashboard: 'bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-md p-6',
    stats: 'bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-md p-4',
    glass: 'backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-blue-200/50 dark:border-blue-500/30 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.01] transition-all duration-300',
    solid: 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300'
  }

  return (
    <div
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    />
  )
})
Card.displayName = 'Card'

const CardHeader = forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({ className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef(({ className = '', ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600 dark:text-gray-400', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }