import React from 'react'

const PhaseCard = ({ title, icon, color, stats, children }) => {
  return (
    <section
      className={`bg-royalPurple-card rounded-lg shadow-md p-6 border-l-4 ${color}`}
      aria-labelledby={`phase-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <h3
        id={`phase-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="text-lg font-semibold text-royalPurple-text1 mb-4 flex items-center gap-2"
      >
        <span aria-hidden="true">{icon}</span> {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export const StatusBadge = ({ status }) => {
  const isOperational =
    status === 'operational' ||
    status === 'Active' ||
    status === 'Configured' ||
    status === 'Scheduled' ||
    status === 'Applied' ||
    status === 'Running' ||
    status === 'Coordinated' ||
    status === 'Mapped' ||
    status === 'Available' ||
    status === 'Ongoing' ||
    status === 'Optimized' ||
    status === 'Integrated'

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        isOperational
          ? 'bg-royalPurple-success text-royalPurple-successTx'
          : 'bg-royalPurple-danger text-royalPurple-dangerTx'
      }`}
      role="status"
      aria-live="polite"
    >
      {status || 'Loading...'}
    </span>
  )
}

export default PhaseCard
