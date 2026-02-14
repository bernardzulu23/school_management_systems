import React from 'react'
import StatusCard from './StatusCard'

const SystemStatusCard = ({ systemStatus, emergencyMode, getStatusColor }) => {
  return (
    <StatusCard title="System Status" icon="📊">
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
        aria-label={`Overall system status: ${systemStatus}`}
      >
        <div style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%', 
          background: getStatusColor(systemStatus) 
        }} aria-hidden="true"></div>
        <span style={{ fontWeight: '600', textTransform: 'capitalize', color: '#111827' }}>
          {systemStatus}
        </span>
      </div>
      <div 
        style={{ fontSize: '14px', color: '#6b7280' }}
        aria-live="polite"
      >
        Emergency Mode: <span style={{ 
          color: emergencyMode ? '#dc3545' : '#10b981', 
          fontWeight: '600' 
        }}>
          {emergencyMode ? '🚨 ACTIVE' : '✅ Normal'}
        </span>
      </div>
    </StatusCard>
  )
}

export default SystemStatusCard
