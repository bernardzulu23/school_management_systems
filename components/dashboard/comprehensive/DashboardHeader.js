import React from 'react'

const DashboardHeader = ({ systemStatus }) => {
  return (
    <header
      className="bg-white dark:bg-g-800 border-b border-black/[0.09] dark:border-white/[0.09]"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-g-900 dark:text-g-50">
              <span role="img" aria-label="Zambia Flag">
                🇿🇲
              </span>{' '}
              Zambian School Management System
            </h1>
            <p className="text-sm text-g-700 dark:text-g-200">
              Comprehensive Rural Education Platform - All 5 Phases Integrated
            </p>
          </div>
          <div className="flex items-center space-x-4" role="status">
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                systemStatus?.integration_status === 'operational'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-[#fffbeb] text-[#92400e]'
              }`}
              aria-live="polite"
            >
              System Status: {systemStatus?.integration_status || 'Loading...'}
            </div>
            <div
              className="text-sm text-g-700 dark:text-g-200"
              aria-label={`Overall performance ${systemStatus?.overall_performance || '0'} percent`}
            >
              Performance: {systemStatus?.overall_performance || '0'}%
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
