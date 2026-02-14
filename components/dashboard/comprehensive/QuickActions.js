import React from 'react'

const QuickActions = () => {
  const actions = [
    { label: 'Send SMS Alert', color: 'bg-blue-500 hover:bg-blue-600', icon: '📱' },
    { label: 'Check Health Status', color: 'bg-green-500 hover:bg-green-600', icon: '🏥' },
    { label: 'Economic Assistance', color: 'bg-yellow-500 hover:bg-yellow-600', icon: '💰' },
    { label: 'Device Schedule', color: 'bg-purple-500 hover:bg-purple-600', icon: '💻' },
    { label: 'Emergency Mode', color: 'bg-red-500 hover:bg-red-600', icon: '🚨' },
    { label: 'System Report', color: 'bg-indigo-500 hover:bg-indigo-600', icon: '📊' }
  ]

  return (
    <section className="bg-white rounded-lg shadow-md p-6" aria-labelledby="quick-actions-title">
      <h3 id="quick-actions-title" className="text-lg font-semibold text-gray-800 mb-4">⚡ Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <button 
            key={index} 
            className={`${action.color} text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 outline-none`}
            aria-label={action.label}
          >
            <span aria-hidden="true">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export default QuickActions
