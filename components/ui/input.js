import { forwardRef } from 'react'

const Input = forwardRef(({ className = '', type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={`flex h-10 w-full bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
