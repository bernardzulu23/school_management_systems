import React from 'react'
import StatusCard from './StatusCard'

const OfflineStatusCard = ({ offlineStatus }) => {
  return (
    <StatusCard title="Offline Mode" icon="📴">
      <div style={{ marginBottom: '10px' }} aria-label={`Connection status: ${offlineStatus.isOnline ? 'Online' : 'Offline'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: offlineStatus.isOnline ? '#10b981' : '#ef4444'
            }}
            aria-hidden="true"
          ></div>
          <span style={{ fontWeight: '500' }}>{offlineStatus.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      <div 
        style={{ fontSize: '14px', color: '#6b7280' }}
        role="group"
        aria-label="Offline statistics"
      >
        <div style={{ marginBottom: '4px' }}>
          Offline Duration: <span style={{ color: '#374151', fontWeight: '500' }}>{offlineStatus.offlineDuration || 0} days</span>
        </div>
        <div>
          Sync Queue: <span style={{ color: '#374151', fontWeight: '500' }}>{offlineStatus.syncQueueSize || 0} items</span>
        </div>
      </div>
    </StatusCard>
  )
}

export default OfflineStatusCard
