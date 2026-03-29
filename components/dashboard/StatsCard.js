export function StatsCard({ title, value, icon: Icon, description, trend }) {
  return (
    <div
      className="bg-white dark:bg-g-800 border border-black/[0.09] dark:border-white/[0.09] rounded-[14px] p-4 flex items-center gap-3 hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)] hover:border-black/[0.18] transition-all"
      role="region"
      aria-labelledby={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="bg-g-100 dark:bg-g-900 border border-g-200 dark:border-white/[0.09] rounded-[12px] w-11 h-11 flex items-center justify-center shrink-0">
        <Icon className="h-6 w-6 text-g-800 dark:text-g-50" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p
          id={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          className="text-xs font-semibold text-g-700 dark:text-g-200 mb-1"
        >
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-[22px] font-bold text-g-900 dark:text-g-50">{value}</p>
          {trend && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                trend.isPositive ? 'bg-up-bg text-up-text' : 'bg-down-bg text-down-text'
              }`}
              aria-label={`${trend.isPositive ? 'Increase' : 'Decrease'} of ${Math.abs(trend.value)}%`}
            >
              <span aria-hidden="true">{trend.isPositive ? '↗' : '↘'}</span> {Math.abs(trend.value)}
              %
            </span>
          )}
        </div>
        {description && <p className="text-xs text-g-600 dark:text-g-300">{description}</p>}
      </div>
    </div>
  )
}
