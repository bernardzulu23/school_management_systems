import React from 'react'

const QuickActions = () => {
  const actions = [
    { label: 'View Reports', icon: '📊', color: '#6366f1' },
    { label: 'Manage Students', icon: '👥', color: '#8b5cf6' },
    { label: 'Fee Management', icon: '💰', color: '#06b6d4' },
    { label: 'Send SMS', icon: '📱', color: '#84cc16' },
  ]

  return (
    <section
      style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
      aria-labelledby="zambian-quick-actions-title"
    >
      <h3 id="zambian-quick-actions-title" style={{ margin: '0 0 15px 0', color: '#111111' }}>
        ⚡ Quick Actions
      </h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {actions.map((action, index) => (
          <button
            key={index}
            style={{
              padding: '10px 15px',
              background: action.color,
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none',
              transition: 'transform 0.1s ease',
            }}
            aria-label={action.label}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.4)')}
            onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
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
