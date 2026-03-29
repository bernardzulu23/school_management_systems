import React from 'react'

const DashboardHeader = ({ systemStatus }) => {
  return (
    <header className="bg-royalPurple-deep border-b border-royalPurple-border" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">
              <span role="img" aria-label="Zambia Flag">
                🇿🇲
              </span>{' '}
              Zambian School Management System
            </h1>
            <p className="text-sm text-royalPurple-text2">
              Comprehensive Rural Education Platform - All 5 Phases Integrated
            </p>
          </div>
          <div className="flex items-center space-x-4" role="status">
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                systemStatus?.integration_status === 'operational'
                  ? 'bg-royalPurple-success text-royalPurple-successTx'
                  : 'bg-royalPurple-accentBg text-royalPurple-accentTx'
              }`}
              aria-live="polite"
            >
              System Status: {systemStatus?.integration_status || 'Loading...'}
            </div>
            <div
              className="text-sm text-royalPurple-text2"
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
