import { cn } from '@/lib/utils'

const badgeVariants = {
  default: 'border-transparent bg-royalPurple-accent text-white',
  secondary: 'border-transparent bg-royalPurple-card2 text-royalPurple-text1',
  destructive: 'border-transparent bg-royalPurple-danger text-royalPurple-dangerTx',
  outline: 'border-royalPurple-border text-royalPurple-text1',
  success: 'border-transparent bg-royalPurple-success text-royalPurple-successTx',
  warning: 'border-transparent bg-royalPurple-accentBg text-royalPurple-accentTx',
}

export function Badge({ className = '', variant = 'default', children, ...props }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(
        'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
