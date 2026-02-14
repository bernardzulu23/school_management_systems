import React from 'react'

const DashboardHeader = ({ currentLanguage, handleLanguageChange, handleEmergencyButton }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: '30px',
      padding: '20px',
      background: 'white',
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div>
        <h1 style={{ margin: 0, color: '#1f2937' }}>🇿🇲 Zambian School Management</h1>
        <p style={{ margin: '5px 0 0 0', color: '#6b7280' }}>
          Ultra-Low Infrastructure School System
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Language Selector */}
        <select 
          value={currentLanguage} 
          onChange={(e) => handleLanguageChange(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: '5px' 
          }}
        >
          <option value="en">English</option>
          <option value="bem">Ichibemba</option>
          <option value="ton">Chitonga</option>
          <option value="nya">Chinyanja</option>
          <option value="loz">Silozi</option>
        </select>
        
        {/* Emergency Button */}
        <button
          onClick={handleEmergencyButton}
          style={{
            padding: '10px 15px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🚨 EMERGENCY
        </button>
      </div>
    </div>
  )
}

export default DashboardHeader
