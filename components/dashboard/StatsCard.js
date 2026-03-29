export function StatsCard({ title, value, icon: Icon, description, trend }) {
  return (
    <div
      className="bg-royalPurple-card border border-royalPurple-border rounded-xl p-4 flex items-center gap-3"
      role="region"
      aria-labelledby={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="bg-royalPurple-card2 border border-royalPurple-border rounded-lg w-11 h-11 flex items-center justify-center shrink-0">
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
          {trend && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                trend.isPositive
                  ? 'bg-royalPurple-success text-royalPurple-successTx'
                  : 'bg-royalPurple-danger text-royalPurple-dangerTx'
              }`}
              aria-label={`${trend.isPositive ? 'Increase' : 'Decrease'} of ${Math.abs(trend.value)}%`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {description && <p className="text-royalPurple-text3 text-xs mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
