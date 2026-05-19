import React from 'react'
import StatusCard from './StatusCard'

const SMSSystemCard = ({ smsStats, testSMSSystem }) => {
  return (
    <StatusCard title="SMS System" icon="📱">
      <div
        style={{ marginBottom: '15px', fontSize: '14px', color: '#4b5563' }}
        role="group"
        aria-label="SMS system statistics"
      >
        <div style={{ marginBottom: '4px' }}>
          Success Rate:{' '}
          <span style={{ color: '#111111', fontWeight: '600' }}>{smsStats.successRate || 0}%</span>
        </div>
        <div style={{ marginBottom: '4px' }}>
          Pending Messages:{' '}
          <span style={{ color: '#111111', fontWeight: '600' }}>{smsStats.pending || 0}</span>
        </div>
        <div>
          Registered Users:{' '}
          <span style={{ color: '#111111', fontWeight: '600' }}>
            {smsStats.registeredUsers || 0}
          </span>
        </div>
      </div>
      <button
        onClick={testSMSSystem}
        style={{
          padding: '8px 16px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
        aria-label="Test SMS delivery system"
        onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.4)')}
        onBlur={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)')}
        onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
        onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
      >
        Test SMS System
      </button>
    </StatusCard>
  )
}

export default SMSSystemCard
