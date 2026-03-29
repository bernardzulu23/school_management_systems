import { forwardRef } from 'react'

const Label = forwardRef(({ className = '', ...props }, ref) => (
  <label
    ref={ref}
    className={`text-royalPurple-text2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
