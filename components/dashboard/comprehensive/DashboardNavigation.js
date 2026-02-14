import React from 'react'

const DashboardNavigation = ({ activePhase, setActivePhase }) => {
  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'phase1', label: '📱 Survival Features' },
    { id: 'phase2', label: '🌾 Rural Education' },
    { id: 'phase3', label: '🏥 Health & Nutrition' },
    { id: 'phase4', label: '🚌 Economic & Transport' },
    { id: 'phase5', label: '♻️ Sustainability' }
  ]

  return (
    <div className="bg-white border-b" role="navigation" aria-label="Phase selection">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8 py-3 overflow-x-auto" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActivePhase(tab.id)}
              role="tab"
              aria-selected={activePhase === tab.id}
              aria-controls={`phase-content-${tab.id}`}
              id={`phase-tab-${tab.id}`}
              className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activePhase === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default DashboardNavigation
