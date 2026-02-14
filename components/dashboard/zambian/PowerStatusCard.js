import React from 'react'
import StatusCard from './StatusCard'

const PowerStatusCard = ({ powerStatus, getBatteryColor }) => {
  const batteryLevel = powerStatus.batteryLevel || 0;
  
  return (
    <StatusCard title="Power Status" icon="🔋">
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Battery Level:</span>
          <span 
            style={{ 
              color: getBatteryColor(batteryLevel),
              fontWeight: 'bold'
            }}
            aria-label={`${batteryLevel.toFixed(1)} percent`}
          >
            {batteryLevel.toFixed(1)}%
          </span>
        </div>
        <div 
          style={{ 
            width: '100%', 
            height: '8px', 
            background: '#e5e7eb', 
            borderRadius: '4px',
          }}
          role="progressbar"
          aria-valuenow={batteryLevel}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Battery charge level"
        >
          <div style={{ 
            width: `${batteryLevel}%`, 
            height: '100%', 
            background: getBatteryColor(batteryLevel),
            borderRadius: '4px'
          }}></div>
        </div>
      </div>
      <div 
        style={{ fontSize: '14px', color: '#6b7280' }}
        role="group"
        aria-label="Power details"
      >
        <div style={{ marginBottom: '4px' }}>
          Mode: <span style={{ color: '#374151', fontWeight: '500' }}>{powerStatus.powerMode || 'Unknown'}</span>
        </div>
        <div>
          Consumption: <span style={{ color: '#374151', fontWeight: '500' }}>{powerStatus.powerConsumption || 0}W</span>
        </div>
      </div>
    </StatusCard>
  )
}

export default PowerStatusCard
