import React from 'react'

const StatusCard = ({ title, icon, children }) => (
  <section
    style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}
    aria-labelledby={`zambian-status-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <h3
      id={`zambian-status-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
      style={{ margin: '0 0 15px 0', color: '#111111' }}
    >
      <span aria-hidden="true">{icon}</span> {title}
    </h3>
    <div className="space-y-2">{children}</div>
  </section>
)

export default StatusCard
