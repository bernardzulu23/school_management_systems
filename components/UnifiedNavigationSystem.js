import React, { useState, useEffect } from 'react'
import { PhaseIntegrationSystem } from '../lib/phaseIntegrationSystem'

const UnifiedNavigationSystem = ({ userRole, userId, currentPage, onNavigate }) => {
  const [activePhase, setActivePhase] = useState('PHASE_1')
  const [availableFeatures, setAvailableFeatures] = useState([])
  const [integration, setIntegration] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    initializeNavigation()
  }, [userRole, userId])

  const initializeNavigation = () => {
    const userIntegration = PhaseIntegrationSystem.initializeIntegration(userId, userRole)
    setIntegration(userIntegration)
    
    const features = PhaseIntegrationSystem.getAvailableFeatures(userRole)
    setAvailableFeatures(features)
    
    loadNotifications()
  }

  const loadNotifications = () => {
    // Simulate loading cross-phase notifications
    const sampleNotifications = [
      { id: 1, phase: 'PHASE_1', type: 'achievement', message: 'New badge earned!', priority: 'medium' },
      { id: 2, phase: 'PHASE_2', type: 'ai_insight', message: 'Learning recommendation available', priority: 'low' },
      { id: 3, phase: 'PHASE_4', type: 'wellbeing', message: 'Wellbeing check reminder', priority: 'high' }
    ]
    setNotifications(sampleNotifications)
  }

  const getPhaseNavigation = () => {
    const phases = PhaseIntegrationSystem.PHASE_FEATURES
    const userPermissions = PhaseIntegrationSystem.ROLE_PERMISSIONS[userRole]
    
    return Object.entries(phases)
      .filter(([phaseKey]) => userPermissions.phases.includes(phaseKey))
      .map(([phaseKey, phaseData]) => ({
        key: phaseKey,
        name: phaseData.name,
        features: userPermissions.features[phaseKey] || [],
        icon: getPhaseIcon(phaseKey),
        color: getPhaseColor(phaseKey)
      }))
  }

  const getPhaseIcon = (phaseKey) => {
    const icons = {
      PHASE_1: '🎮',
      PHASE_2: '🤖',
      PHASE_3: '💬',
      PHASE_4: '💚',
      PHASE_5: '🚀'
    }
    return icons[phaseKey] || '📱'
  }

  const getPhaseColor = (phaseKey) => {
    const colors = {
      PHASE_1: '#10b981', // Green for gamification
      PHASE_2: '#3b82f6', // Blue for AI
      PHASE_3: '#8b5cf6', // Purple for communication
      PHASE_4: '#f59e0b', // Amber for wellbeing
      PHASE_5: '#ef4444'  // Red for innovation
    }
    return colors[phaseKey] || '#6b7280'
  }

  const getQuickActions = () => {
    const actions = {
      student: [
        { name: 'My Portfolio', phase: 'PHASE_5', icon: '📁', action: () => onNavigate('portfolio') },
        { name: 'Study Groups', phase: 'PHASE_3', icon: '👥', action: () => onNavigate('study-groups') },
        { name: 'AI Tutor', phase: 'PHASE_2', icon: '🤖', action: () => onNavigate('ai-tutor') },
        { name: 'Achievements', phase: 'PHASE_1', icon: '🏆', action: () => onNavigate('achievements') }
      ],
      teacher: [
        { name: 'Class Analytics', phase: 'PHASE_1', icon: '📊', action: () => onNavigate('analytics') },
        { name: 'Assessment Tools', phase: 'PHASE_5', icon: '📝', action: () => onNavigate('assessment') },
        { name: 'Student Wellbeing', phase: 'PHASE_4', icon: '💚', action: () => onNavigate('wellbeing') },
        { name: 'Communication', phase: 'PHASE_3', icon: '💬', action: () => onNavigate('communication') }
      ],
      hod: [
        { name: 'Department Overview', phase: 'PHASE_1', icon: '🏢', action: () => onNavigate('department') },
        { name: 'Innovation Labs', phase: 'PHASE_5', icon: '🧪', action: () => onNavigate('innovation') },
        { name: 'Teacher Performance', phase: 'PHASE_2', icon: '👨‍🏫', action: () => onNavigate('performance') },
        { name: 'Collaboration Hub', phase: 'PHASE_3', icon: '🤝', action: () => onNavigate('collaboration') }
      ],
      headteacher: [
        { name: 'School Dashboard', phase: 'PHASE_1', icon: '🏫', action: () => onNavigate('school-dashboard') },
        { name: 'Strategic Insights', phase: 'PHASE_2', icon: '🎯', action: () => onNavigate('insights') },
        { name: 'System Settings', phase: 'PHASE_4', icon: '⚙️', action: () => onNavigate('settings') },
        { name: 'Innovation Strategy', phase: 'PHASE_5', icon: '🚀', action: () => onNavigate('innovation-strategy') }
      ]
    }
    
    return actions[userRole] || []
  }

  const getNotificationCount = (phase) => {
    return notifications.filter(n => n.phase === phase).length
  }

  const getTotalNotifications = () => {
    return notifications.length
  }

  const handlePhaseSelect = (phaseKey) => {
    setActivePhase(phaseKey)
    onNavigate(`phase-${phaseKey.toLowerCase()}`)
  }

  const renderPhaseNavigation = () => {
    const phases = getPhaseNavigation()
    
    return (
      <div className="phase-navigation">
        <h3>System Phases</h3>
        <div className="phase-list">
          {phases.map(phase => (
            <div 
              key={phase.key}
              className={`phase-item ${activePhase === phase.key ? 'active' : ''}`}
              onClick={() => handlePhaseSelect(phase.key)}
              style={{ borderLeftColor: phase.color }}
            >
              <div className="phase-header">
                <span className="phase-icon">{phase.icon}</span>
                <span className="phase-name">{phase.name}</span>
                {getNotificationCount(phase.key) > 0 && (
                  <span className="notification-badge">
                    {getNotificationCount(phase.key)}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="phase-features">
                  {phase.features.slice(0, 3).map(feature => (
                    <span key={feature} className="feature-tag">
                      {feature.replace('_', ' ')}
                    </span>
                  ))}
                  {phase.features.length > 3 && (
                    <span className="feature-more">+{phase.features.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderQuickActions = () => {
    const actions = getQuickActions()
    
    return (
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          {actions.map((action, index) => (
            <button 
              key={index}
              className="action-button"
              onClick={action.action}
              style={{ borderColor: getPhaseColor(action.phase) }}
            >
              <span className="action-icon">{action.icon}</span>
              {!isCollapsed && <span className="action-name">{action.name}</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderNotificationCenter = () => {
    return (
      <div className="notification-center">
        <div className="notification-header">
          <h3>Notifications</h3>
          <span className="notification-count">{getTotalNotifications()}</span>
        </div>
        {!isCollapsed && (
          <div className="notification-list">
            {notifications.slice(0, 5).map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.priority}`}
              >
                <div className="notification-content">
                  <span className="notification-phase">
                    {getPhaseIcon(notification.phase)}
                  </span>
                  <span className="notification-message">{notification.message}</span>
                </div>
              </div>
            ))}
            {notifications.length > 5 && (
              <button className="view-all-notifications">
                View All ({notifications.length})
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`unified-navigation ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="navigation-header">
        <div className="user-info">
          <div className="user-avatar">{userRole.charAt(0).toUpperCase()}</div>
          {!isCollapsed && (
            <div className="user-details">
              <span className="user-role">{userRole}</span>
              <span className="user-id">ID: {userId}</span>
            </div>
          )}
        </div>
        <button 
          className="collapse-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {renderPhaseNavigation()}
      {renderQuickActions()}
      {renderNotificationCenter()}

      <style jsx>{`
        .unified-navigation {
          width: 320px;
          height: 100vh;
          background: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
          overflow-y: auto;
        }

        .unified-navigation.collapsed {
          width: 80px;
        }

        .navigation-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-role {
          font-weight: 600;
          color: #1f2937;
          text-transform: capitalize;
        }

        .user-id {
          font-size: 12px;
          color: #6b7280;
        }

        .collapse-toggle {
          background: #f3f4f6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: background 0.2s;
        }

        .collapse-toggle:hover {
          background: #e5e7eb;
        }

        .phase-navigation,
        .quick-actions,
        .notification-center {
          padding: 20px;
          border-bottom: 1px solid #f3f4f6;
        }

        .phase-navigation h3,
        .quick-actions h3,
        .notification-center h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .phase-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .phase-item {
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          background: #f9fafb;
        }

        .phase-item:hover {
          background: #f3f4f6;
          transform: translateX(4px);
        }

        .phase-item.active {
          background: #eff6ff;
          border-left-color: #3b82f6;
        }

        .phase-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .phase-icon {
          font-size: 20px;
        }

        .phase-name {
          font-weight: 500;
          color: #1f2937;
          flex: 1;
        }

        .notification-badge {
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
        }

        .phase-features {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .feature-tag {
          background: #e0e7ff;
          color: #3730a3;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .feature-more {
          color: #6b7280;
          font-size: 10px;
          font-style: italic;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
        }

        .collapsed .action-grid {
          grid-template-columns: 1fr;
        }

        .action-button {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          text-align: left;
        }

        .action-button:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
        }

        .action-icon {
          font-size: 18px;
        }

        .action-name {
          font-size: 12px;
          font-weight: 500;
          color: #1f2937;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .notification-count {
          background: #3b82f6;
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 12px;
          min-width: 20px;
          text-align: center;
        }

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .notification-item {
          padding: 8px 12px;
          border-radius: 6px;
          border-left: 3px solid #e5e7eb;
        }

        .notification-item.high {
          background: #fef2f2;
          border-left-color: #ef4444;
        }

        .notification-item.medium {
          background: #fffbeb;
          border-left-color: #f59e0b;
        }

        .notification-item.low {
          background: #f0f9ff;
          border-left-color: #3b82f6;
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification-phase {
          font-size: 14px;
        }

        .notification-message {
          font-size: 12px;
          color: #1f2937;
          flex: 1;
        }

        .view-all-notifications {
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 12px;
          cursor: pointer;
          padding: 8px;
          text-align: center;
          width: 100%;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .view-all-notifications:hover {
          background: #f0f9ff;
        }
      `}</style>
    </div>
  )
}

export default UnifiedNavigationSystem
