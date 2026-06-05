import { cn } from '@/lib/utils'

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-label="Loading"
      className={cn('animate-pulse rounded-md bg-royalPurple-card2', className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
