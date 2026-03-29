import React from 'react'

const QuickActions = () => {
  const actions = [
    {
      label: 'Send SMS Alert',
      color: 'bg-royalPurple-accent hover:bg-royalPurple-accent',
      icon: '📱',
    },
    {
      label: 'Check Health Status',
      color: 'bg-royalPurple-success hover:bg-royalPurple-success',
      icon: '🏥',
    },
    { label: 'Economic Assistance', color: 'bg-yellow-500 hover:bg-yellow-600', icon: '💰' },
    {
      label: 'Device Schedule',
      color: 'bg-royalPurple-pill hover:bg-royalPurple-pill',
      icon: '💻',
    },
    {
      label: 'Emergency Mode',
      color: 'bg-royalPurple-danger hover:bg-royalPurple-danger',
      icon: '🚨',
    },
    { label: 'System Report', color: 'bg-royalPurple-pill hover:bg-royalPurple-pill', icon: '📊' },
  ]

  return (
    <section
      className="bg-royalPurple-card rounded-lg shadow-md p-6"
      aria-labelledby="quick-actions-title"
    >
      <h3 id="quick-actions-title" className="text-lg font-semibold text-royalPurple-text1 mb-4">
        ⚡ Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`${action.color} text-royalPurple-text1 px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 outline-none`}
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
