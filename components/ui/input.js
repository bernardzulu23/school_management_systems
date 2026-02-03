import { forwardRef } from 'react'

const Input = forwardRef(({ className = '', type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-900 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-white ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
