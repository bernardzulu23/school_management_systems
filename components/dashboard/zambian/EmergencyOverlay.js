import React from 'react'

const EmergencyOverlay = ({ alertData, onAcknowledge }) => {
  if (!alertData) return null

  return (
    <div 
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-alert-title"
      aria-describedby="emergency-alert-desc"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(220, 53, 69, 0.95)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        fontSize: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '80%', padding: '20px' }}>
        <h2 id="emergency-alert-title" style={{ margin: '0 0 10px 0' }}>
          <span aria-hidden="true">🚨</span> <strong>EMERGENCY ALERT</strong>
        </h2>
        <p id="emergency-alert-desc" style={{ marginBottom: '20px' }}>
          {alertData.description}
        </p>
        <p style={{ fontSize: '18px', marginBottom: '30px' }}>
          <small>Emergency services have been notified</small>
        </p>
        <button 
          onClick={onAcknowledge}
          autoFocus
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#dc3545',
            border: 'none',
            borderRadius: '5px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
            outline: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
          }}
          aria-label="Acknowledge emergency alert"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 255, 255, 0.5)'}
          onBlur={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)'}
        >
          Acknowledge
        </button>
      </div>
    </div>
  )
}

export default EmergencyOverlay
