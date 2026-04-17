export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'card',
  className = '',
}) {
  const wrapperClass =
    variant === 'flat'
      ? `flex items-center gap-3 ${className}`.trim()
      : `bg-royalPurple-card border border-royalPurple-border rounded-xl p-4 flex items-center gap-3 ${className}`.trim()

  const iconWrapClass =
    variant === 'flat'
      ? 'w-11 h-11 flex items-center justify-center shrink-0'
      : 'bg-royalPurple-card2 border border-royalPurple-border rounded-lg w-11 h-11 flex items-center justify-center shrink-0'

  return (
    <div
      className={wrapperClass}
      role="region"
      aria-labelledby={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={iconWrapClass}>
        <Icon className="h-6 w-6 text-royalPurple-text2" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p
          id={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          className="text-royalPurple-text2 text-xs mb-1 font-semibold"
        >
          {title}
        </p>
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <span className="text-royalPurple-text1 text-2xl font-bold leading-none">{value}</span>
        </div>
        {description && <p className="text-royalPurple-text3 text-xs mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
