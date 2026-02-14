export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = 'blue'
}) {
  const colorClasses = {
    blue: {
      gradient: 'from-white via-blue-50/50 to-white dark:from-slate-800 dark:via-blue-900/10 dark:to-slate-800',
      border: 'border-blue-200/50 dark:border-blue-500/20',
      iconBg: 'bg-gradient-to-r from-blue-600 to-blue-700',
      text: 'text-blue-700 dark:text-blue-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-blue-500/10'
    },
    green: {
      gradient: 'from-white via-green-50/50 to-white dark:from-slate-800 dark:via-green-900/10 dark:to-slate-800',
      border: 'border-green-200/50 dark:border-green-500/20',
      iconBg: 'bg-gradient-to-r from-green-600 to-green-700',
      text: 'text-green-700 dark:text-green-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-green-500/10'
    },
    yellow: {
      gradient: 'from-white via-yellow-50/50 to-white dark:from-slate-800 dark:via-yellow-900/10 dark:to-slate-800',
      border: 'border-yellow-200/50 dark:border-yellow-500/20',
      iconBg: 'bg-gradient-to-r from-yellow-600 to-yellow-700',
      text: 'text-yellow-700 dark:text-yellow-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-yellow-500/10'
    },
    red: {
      gradient: 'from-white via-red-50/50 to-white dark:from-slate-800 dark:via-red-900/10 dark:to-slate-800',
      border: 'border-red-200/50 dark:border-red-500/20',
      iconBg: 'bg-gradient-to-r from-red-600 to-red-700',
      text: 'text-red-700 dark:text-red-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-red-500/10'
    },
    purple: {
      gradient: 'from-white via-purple-50/50 to-white dark:from-slate-800 dark:via-purple-900/10 dark:to-slate-800',
      border: 'border-purple-200/50 dark:border-purple-500/20',
      iconBg: 'bg-gradient-to-r from-purple-600 to-purple-700',
      text: 'text-purple-700 dark:text-purple-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-purple-500/10'
    },
    orange: {
      gradient: 'from-white via-orange-50/50 to-white dark:from-slate-800 dark:via-orange-900/10 dark:to-slate-800',
      border: 'border-orange-200/50 dark:border-orange-500/20',
      iconBg: 'bg-gradient-to-r from-orange-600 to-orange-700',
      text: 'text-orange-700 dark:text-orange-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-orange-500/10'
    },
    teal: {
      gradient: 'from-white via-teal-50/50 to-white dark:from-slate-800 dark:via-teal-900/10 dark:to-slate-800',
      border: 'border-teal-200/50 dark:border-teal-500/20',
      iconBg: 'bg-gradient-to-r from-teal-600 to-teal-700',
      text: 'text-teal-700 dark:text-teal-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-teal-500/10'
    },
    indigo: {
      gradient: 'from-white via-indigo-50/50 to-white dark:from-slate-800 dark:via-indigo-900/10 dark:to-slate-800',
      border: 'border-indigo-200/50 dark:border-indigo-500/20',
      iconBg: 'bg-gradient-to-r from-indigo-600 to-indigo-700',
      text: 'text-indigo-700 dark:text-indigo-400',
      valueText: 'text-gray-900 dark:text-white',
      descText: 'text-gray-600 dark:text-gray-400',
      shadow: 'shadow-indigo-500/10'
    },
  }

  const colorConfig = colorClasses[color] || colorClasses.blue

  return (
    <div 
      className={`stats-card bg-gradient-to-br ${colorConfig.gradient} border ${colorConfig.border} rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden ${colorConfig.shadow}`}
      role="region"
      aria-labelledby={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <p 
            id={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
            className={`text-sm font-semibold ${colorConfig.text} mb-2`}
          >
            {title}
          </p>
          <div className="flex items-baseline space-x-3 mb-2">
            <p className={`text-3xl font-bold ${colorConfig.valueText}`}>
              {value}
            </p>
            {trend && (
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  trend.isPositive
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}
                aria-label={`${trend.isPositive ? 'Increase' : 'Decrease'} of ${Math.abs(trend.value)}%`}
              >
                <span aria-hidden="true">{trend.isPositive ? '↗' : '↘'}</span> {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {description && (
            <p className={`text-xs ${colorConfig.descText} font-medium`}>
              {description}
            </p>
          )}
        </div>
        <div 
          className={`${colorConfig.iconBg} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-all duration-300`}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent"></div>
      </div>
    </div>
  )
}
