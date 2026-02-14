import React from 'react'

const PhaseCard = ({ title, icon, color, stats, children }) => {
  return (
    <section 
      className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}
      aria-labelledby={`phase-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <h3 
        id={`phase-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"
      >
        <span aria-hidden="true">{icon}</span> {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </section>
  )
}

export const StatusBadge = ({ status }) => {
  const isOperational = status === 'operational' || status === 'Active' || status === 'Configured' || status === 'Scheduled' || status === 'Applied' || status === 'Running' || status === 'Coordinated' || status === 'Mapped' || status === 'Available' || status === 'Ongoing' || status === 'Optimized' || status === 'Integrated'
  
  return (
    <span 
      className={`px-2 py-1 rounded text-xs font-medium ${
        isOperational 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}
      role="status"
      aria-live="polite"
    >
      {status || 'Loading...'}
    </span>
  )
}

export default PhaseCard
