import React from 'react'
import StatusCard from './StatusCard'

const LanguageSupportCard = ({ languageStats }) => {
  return (
    <StatusCard title="Languages" icon="🌍">
      <div style={{ marginBottom: '10px' }} aria-label="Language support details">
        <span className="block">Current: {languageStats.currentLanguageName || 'English'}</span>
        <span className="block">Supported: {languageStats.supportedLanguages || 0}</span>
        <span className="block" aria-label={`Voice support: ${languageStats.speechSynthesisSupported ? 'enabled' : 'disabled'}`}>
          Voice Support: {languageStats.speechSynthesisSupported ? '✅' : '❌'}
        </span>
      </div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>
        Translation Keys: {languageStats.translationKeys || 0}
      </div>
    </StatusCard>
  )
}

export default LanguageSupportCard
