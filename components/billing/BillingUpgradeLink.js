'use client'

const BILLING_HREF = '/dashboard/billing'

/**
 * Reliable upgrade/renew CTA with an explicit click handler.
 * Hard-navigates to billing so expired dashboards actually show the upgrade UI
 * (the layout otherwise hides page children when the plan is expired).
 */
export function BillingUpgradeLink({
  children,
  className = '',
  href = BILLING_HREF,
  variant = 'button',
}) {
  const go = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (typeof window !== 'undefined') {
      window.location.assign(href)
    }
  }

  return (
    <a
      href={href}
      onClick={go}
      className={className}
      role={variant === 'link' ? 'link' : 'button'}
      data-billing-cta="1"
    >
      {children}
    </a>
  )
}
