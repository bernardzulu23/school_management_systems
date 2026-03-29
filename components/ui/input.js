import { forwardRef } from 'react'

const Input = forwardRef(({ className = '', type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-[10px] border border-g-200 bg-white dark:bg-g-800 px-3 py-2 text-sm ring-offset-transparent file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-g-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-g-600 focus-visible:border-g-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-g-50 ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
