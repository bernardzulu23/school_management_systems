import React, { useState, useEffect } from 'react'
import { PhaseIntegrationSystem } from '../lib/phaseIntegrationSystem'
import { UniversalAccessibilitySystem } from '../lib/universalAccessibilitySystem'
import { EmergingTechnologySystem } from '../lib/emergingTechnologySystem'

const ComprehensiveSettingsPanel = ({ userRole, userId, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({})
  const [availableFeatures, setAvailableFeatures] = useState([])
  const [technologySupport, setTechnologySupport] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    loadSettings()
    checkFeatureAvailability()
    checkTechnologySupport()
  }, [userRole, userId])

  const loadSettings = () => {
    // Simulate loading user settings from all phases
    const defaultSettings = {
      general: {
        theme: 'blue_white',
        language: 'english',
        timezone: 'UTC',
        autoSave: true,
        notifications: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false,
        keyboardNavigation: true,
        reducedMotion: false,
        colorBlindSupport: false,
        fontSize: 'medium',
        lineHeight: 'normal'
      },
      gamification: {
        showLeaderboards: true,
        publicAchievements: true,
        soundEffects: true,
        animations: true,
        competitiveMode: true,
        progressNotifications: true
      },
      ai: {
        personalizedRecommendations: true,
        learningAnalytics: true,
        predictiveInsights: true,
        adaptiveDifficulty: true,
        dataSharing: true,
        aiTutorVoice: 'neutral'
      },
      communication: {
        realTimeNotifications: true,
        emailDigest: 'daily',
        messagePreview: true,
        onlineStatus: true,
        groupInvitations: true,
        directMessages: true
      },
      wellbeing: {
        dailyCheckIns: true,
        stressMonitoring: true,
        breakReminders: true,
        moodTracking: true,
        privacyLevel: 'moderate',
        interventionAlerts: true
      },
      innovation: {
        voiceInterface: false,
        arVrExperiences: true,
        iotIntegration: true,
        blockchainCredentials: true,
        innovationNotifications: true,
        labBookingReminders: true
      },
      privacy: {
        dataSharing: 'limited',
        analyticsOptIn: true,
        publicProfile: false,
        shareProgress: true,
        allowResearch: false,
        cookieConsent: true
      }
    }
    
    setSettings(defaultSettings)
  }

  const checkFeatureAvailability = () => {
    const features = PhaseIntegrationSystem.getAvailableFeatures(userRole)
    setAvailableFeatures(features)
  }

  const checkTechnologySupport = () => {
    const support = EmergingTechnologySystem.getAvailableTechnologies()
    setTechnologySupport(support)
  }

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    setSaveStatus('Saving...')
    
    try {
      // Simulate saving settings
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Apply accessibility settings
      if (settings.accessibility) {
        UniversalAccessibilitySystem.applyUserPreferences(userId, settings.accessibility)
      }
      
      // Notify parent component
      if (onSettingsChange) {
        onSettingsChange(settings)
      }
      
      setSaveStatus('Settings saved successfully!')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setSaveStatus('Failed to save settings')
      setTimeout(() => setSaveStatus(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      loadSettings()
      setSaveStatus('Settings reset to defaults')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>General Settings</h3>
      
      <div className="setting-group">
        <label>Theme</label>
        <select 
          value={settings.general?.theme || 'blue_white'}
          onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
        >
          <option value="blue_white">Blue & White</option>
          <option value="dark">Dark Mode</option>
          <option value="high_contrast">High Contrast</option>
        </select>
      </div>
      
      <div className="setting-group">
        <label>Language</label>
        <select 
          value={settings.general?.language || 'english'}
          onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
        >
          <option value="english">English</option>
          <option value="spanish">Spanish</option>
          <option value="french">French</option>
        </select>
      </div>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.general?.autoSave || false}
            onChange={(e) => handleSettingChange('general', 'autoSave', e.target.checked)}
          />
          Auto-save changes
        </label>
      </div>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.general?.notifications || false}
            onChange={(e) => handleSettingChange('general', 'notifications', e.target.checked)}
          />
          Enable notifications
        </label>
      </div>
    </div>
  )

  const renderAccessibilitySettings = () => (
    <div className="settings-section">
      <h3>Accessibility Settings</h3>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.accessibility?.highContrast || false}
            onChange={(e) => handleSettingChange('accessibility', 'highContrast', e.target.checked)}
          />
          High contrast mode
        </label>
      </div>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.accessibility?.largeText || false}
            onChange={(e) => handleSettingChange('accessibility', 'largeText', e.target.checked)}
          />
          Large text
        </label>
      </div>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.accessibility?.screenReader || false}
            onChange={(e) => handleSettingChange('accessibility', 'screenReader', e.target.checked)}
          />
          Screen reader support
        </label>
      </div>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.accessibility?.reducedMotion || false}
            onChange={(e) => handleSettingChange('accessibility', 'reducedMotion', e.target.checked)}
          />
          Reduce motion and animations
        </label>
      </div>
      
      <div className="setting-group">
        <label>Font Size</label>
        <select 
          value={settings.accessibility?.fontSize || 'medium'}
          onChange={(e) => handleSettingChange('accessibility', 'fontSize', e.target.value)}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="extra_large">Extra Large</option>
        </select>
      </div>
    </div>
  )

  const renderPhaseSettings = () => (
    <div className="settings-section">
      <h3>Phase Features</h3>
      
      {availableFeatures.includes('gamification') && (
        <div className="phase-group">
          <h4>🎮 Gamification (Phase 1)</h4>
          <div className="setting-group">
            <label>
              <input 
                type="checkbox"
                checked={settings.gamification?.showLeaderboards || false}
                onChange={(e) => handleSettingChange('gamification', 'showLeaderboards', e.target.checked)}
              />
              Show leaderboards
            </label>
          </div>
          <div className="setting-group">
            <label>
              <input 
                type="checkbox"
                checked={settings.gamification?.soundEffects || false}
                onChange={(e) => handleSettingChange('gamification', 'soundEffects', e.target.checked)}
              />
              Sound effects
            </label>
          </div>
        </div>
      )}
      
      {availableFeatures.includes('ai_tutoring') && (
        <div className="phase-group">
          <h4>🤖 AI Features (Phase 2)</h4>
          <div className="setting-group">
            <label>
              <input 
                type="checkbox"
                checked={settings.ai?.personalizedRecommendations || false}
                onChange={(e) => handleSettingChange('ai', 'personalizedRecommendations', e.target.checked)}
              />
              Personalized recommendations
            </label>
          </div>
          <div className="setting-group">
            <label>
              <input 
                type="checkbox"
                checked={settings.ai?.adaptiveDifficulty || false}
                onChange={(e) => handleSettingChange('ai', 'adaptiveDifficulty', e.target.checked)}
              />
              Adaptive difficulty
            </label>
          </div>
        </div>
      )}
      
      {availableFeatures.includes('wellbeing_self_assessment') && (
        <div className="phase-group">
          <h4>💚 Wellbeing (Phase 4)</h4>
          <div className="setting-group">
            <label>
              <input 
                type="checkbox"
                checked={settings.wellbeing?.dailyCheckIns || false}
                onChange={(e) => handleSettingChange('wellbeing', 'dailyCheckIns', e.target.checked)}
              />
              Daily check-ins
            </label>
          </div>
          <div className="setting-group">
            <label>Privacy Level</label>
            <select 
              value={settings.wellbeing?.privacyLevel || 'moderate'}
              onChange={(e) => handleSettingChange('wellbeing', 'privacyLevel', e.target.value)}
            >
              <option value="minimal">Minimal</option>
              <option value="moderate">Moderate</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </div>
        </div>
      )}
      
      {availableFeatures.includes('innovation_projects') && (
        <div className="phase-group">
          <h4>🚀 Innovation (Phase 5)</h4>
          <div className="setting-group">
            <label>
              <input 
                type="checkbox"
                checked={settings.innovation?.voiceInterface || false}
                onChange={(e) => handleSettingChange('innovation', 'voiceInterface', e.target.checked)}
                disabled={!technologySupport.voiceInterface}
              />
              Voice interface {!technologySupport.voiceInterface && '(Not supported)'}
            </label>
          </div>
          <div className="setting-group">
            <label>
              <input 
                type="checkbox"
                checked={settings.innovation?.arVrExperiences || false}
                onChange={(e) => handleSettingChange('innovation', 'arVrExperiences', e.target.checked)}
                disabled={!technologySupport.webXR}
              />
              AR/VR experiences {!technologySupport.webXR && '(Limited support)'}
            </label>
          </div>
        </div>
      )}
    </div>
  )

  const renderPrivacySettings = () => (
    <div className="settings-section">
      <h3>Privacy & Data</h3>
      
      <div className="setting-group">
        <label>Data Sharing</label>
        <select 
          value={settings.privacy?.dataSharing || 'limited'}
          onChange={(e) => handleSettingChange('privacy', 'dataSharing', e.target.value)}
        >
          <option value="none">No sharing</option>
          <option value="limited">Limited sharing</option>
          <option value="full">Full sharing</option>
        </select>
      </div>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.privacy?.analyticsOptIn || false}
            onChange={(e) => handleSettingChange('privacy', 'analyticsOptIn', e.target.checked)}
          />
          Allow analytics for improvement
        </label>
      </div>
      
      <div className="setting-group">
        <label>
          <input 
            type="checkbox"
            checked={settings.privacy?.shareProgress || false}
            onChange={(e) => handleSettingChange('privacy', 'shareProgress', e.target.checked)}
          />
          Share progress with teachers
        </label>
      </div>
    </div>
  )

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'accessibility', name: 'Accessibility', icon: '♿' },
    { id: 'phases', name: 'Features', icon: '🎯' },
    { id: 'privacy', name: 'Privacy', icon: '🔒' }
  ]

  return (
    <div className="comprehensive-settings-panel">
      <div className="settings-header">
        <h1>Settings</h1>
        <div className="settings-actions">
          <button className="reset-btn" onClick={resetToDefaults}>
            Reset to Defaults
          </button>
          <button 
            className="save-btn" 
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      {saveStatus && (
        <div className={`save-status ${saveStatus.includes('success') ? 'success' : 'error'}`}>
          {saveStatus}
        </div>
      )}
      
      <div className="settings-tabs">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>
      
      <div className="settings-content">
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'accessibility' && renderAccessibilitySettings()}
        {activeTab === 'phases' && renderPhaseSettings()}
        {activeTab === 'privacy' && renderPrivacySettings()}
      </div>
      
      <style jsx>{`
        .comprehensive-settings-panel {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .settings-header h1 {
          color: #1e40af;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        
        .settings-actions {
          display: flex;
          gap: 12px;
        }
        
        .reset-btn, .save-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .reset-btn {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        
        .reset-btn:hover {
          background: #e5e7eb;
        }
        
        .save-btn {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          border: none;
          color: white;
        }
        
        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .save-status {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-weight: 500;
        }
        
        .save-status.success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        
        .save-status.error {
          background: #fecaca;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        
        .settings-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 32px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .tab-btn {
          background: none;
          border: none;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          color: #6b7280;
        }
        
        .tab-btn:hover {
          color: #1e40af;
          background: #f8fafc;
        }
        
        .tab-btn.active {
          color: #1e40af;
          border-bottom-color: #3b82f6;
          background: #f8fafc;
        }
        
        .tab-icon {
          font-size: 18px;
        }
        
        .tab-name {
          font-weight: 500;
        }
        
        .settings-content {
          min-height: 400px;
        }
        
        .settings-section {
          margin-bottom: 32px;
        }
        
        .settings-section h3 {
          color: #1f2937;
          margin: 0 0 24px 0;
          font-size: 20px;
          font-weight: 600;
        }
        
        .phase-group {
          margin-bottom: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        .phase-group h4 {
          color: #1f2937;
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .setting-group {
          margin-bottom: 16px;
        }
        
        .setting-group label {
          display: block;
          color: #374151;
          font-weight: 500;
          margin-bottom: 8px;
        }
        
        .setting-group input[type="checkbox"] {
          margin-right: 8px;
        }
        
        .setting-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
        }
        
        .setting-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  )
}

export default ComprehensiveSettingsPanel
