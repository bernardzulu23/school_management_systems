import { cn } from '@/lib/utils'

export function Empty({ className = '', ...props }) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-royalPurple-border bg-royalPurple-card2/40 p-8 text-center md:p-10',
        className
      )}
      {...props}
    />
  )
}

export function EmptyHeader({ className = '', ...props }) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      {...props}
    />
  )
}

export function EmptyMedia({ className = '', ...props }) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        'flex size-12 items-center justify-center rounded-full bg-royalPurple-accentBg text-royalPurple-accent',
        className
      )}
      {...props}
    />
  )
}

export function EmptyTitle({ className = '', ...props }) {
  return (
    <h3
      data-slot="empty-title"
      className={cn('text-base font-semibold text-royalPurple-text1', className)}
      {...props}
    />
  )
}

export function EmptyDescription({ className = '', ...props }) {
  return (
    <p
      data-slot="empty-description"
      className={cn('text-sm text-royalPurple-text3', className)}
      {...props}
    />
  )
}

export function EmptyContent({ className = '', ...props }) {
  return (
    <div
      data-slot="empty-content"
      className={cn('flex flex-col items-center gap-2', className)}
      {...props}
    />
  )
}
