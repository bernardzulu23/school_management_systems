import React, { useState, useEffect } from 'react'
import { PhaseIntegrationSystem } from '../lib/phaseIntegrationSystem'
import UnifiedNavigationSystem from './UnifiedNavigationSystem'
import AdvancedInnovationDashboard from './AdvancedInnovationDashboard'
import MentalHealthSupportInterface from './MentalHealthSupportInterface'

const EnhancedDashboardIntegration = ({ userRole, userId, userName }) => {
  const [currentView, setCurrentView] = useState('dashboard')
  const [integration, setIntegration] = useState(null)
  const [crossPhaseData, setCrossPhaseData] = useState({})
  const [notifications, setNotifications] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeDashboard()
  }, [userRole, userId])

  const initializeDashboard = async () => {
    setLoading(true)
    
    try {
      // Initialize phase integration
      const userIntegration = PhaseIntegrationSystem.initializeIntegration(userId, userRole)
      setIntegration(userIntegration)
      
      // Load cross-phase data
      await loadCrossPhaseData()
      
      // Load user settings
      await loadUserSettings()
      
      // Load notifications
      await loadNotifications()
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
      setLoading(false)
    }
  }

  const loadCrossPhaseData = async () => {
    // Simulate loading integrated data from all phases
    const data = {
      gamification: {
        points: 1250,
        level: 8,
        achievements: ['First Assignment', 'Perfect Attendance', 'Collaboration Master'],
        streaks: { daily_login: 15, assignment_submission: 7 }
      },
      ai_insights: {
        learningStyle: 'Visual',
        recommendations: ['Practice more math problems', 'Join study group for science'],
        predictions: { next_grade: 'A-', improvement_areas: ['Time Management'] }
      },
      communication: {
        unreadMessages: 3,
        activeGroups: 5,
        recentActivity: ['New message in Math Study Group', 'Project update from team']
      },
      wellbeing: {
        currentScore: 78,
        riskLevel: 'LOW',
        lastAssessment: '2024-01-28',
        recommendations: ['Take regular breaks', 'Practice mindfulness']
      },
      assessment: {
        portfolioItems: 12,
        completedAssessments: 8,
        pendingReviews: 2,
        certifications: ['Digital Literacy', 'Collaboration Skills']
      },
      innovation: {
        activeProjects: 2,
        labAccess: ['Coding Lab', 'Media Studio'],
        challenges: 1,
        technologies: { voice: true, ar_vr: false, iot: true }
      }
    }
    
    setCrossPhaseData(data)
  }

  const loadUserSettings = async () => {
    // Simulate loading user preferences
    const userSettings = {
      theme: 'blue_white',
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false,
        voiceInterface: true
      },
      notifications: {
        email: true,
        push: true,
        inApp: true,
        voice: false,
        digest: 'daily'
      },
      privacy: {
        shareProgress: true,
        allowAnalytics: true,
        publicProfile: false
      },
      dashboard: {
        layout: 'grid',
        widgets: ['quick_stats', 'recent_activity', 'achievements', 'wellbeing'],
        autoRefresh: true
      }
    }
    
    setSettings(userSettings)
  }

  const loadNotifications = async () => {
    // Simulate loading cross-phase notifications
    const crossPhaseNotifications = [
      {
        id: 1,
        phase: 'PHASE_1',
        type: 'achievement',
        title: 'New Achievement Unlocked!',
        message: 'You earned the "Collaboration Master" badge',
        priority: 'medium',
        timestamp: new Date(),
        action: { type: 'view_achievement', data: { id: 'collab_master' } }
      },
      {
        id: 2,
        phase: 'PHASE_2',
        type: 'ai_recommendation',
        title: 'Learning Recommendation',
        message: 'AI suggests reviewing algebra concepts',
        priority: 'low',
        timestamp: new Date(),
        action: { type: 'view_recommendation', data: { subject: 'math' } }
      },
      {
        id: 3,
        phase: 'PHASE_4',
        type: 'wellbeing_check',
        title: 'Wellbeing Check-in',
        message: 'Time for your weekly wellbeing assessment',
        priority: 'high',
        timestamp: new Date(),
        action: { type: 'start_assessment', data: { type: 'wellbeing' } }
      }
    ]
    
    setNotifications(crossPhaseNotifications)
  }

  const handleNavigation = (view) => {
    setCurrentView(view)
  }

  const handleNotificationAction = (notification) => {
    const { action } = notification
    
    switch (action.type) {
      case 'view_achievement':
        setCurrentView('achievements')
        break
      case 'view_recommendation':
        setCurrentView('ai-tutor')
        break
      case 'start_assessment':
        setCurrentView('wellbeing')
        break
      default:
        console.log('Unknown notification action:', action)
    }
  }

  const renderDashboardOverview = () => (
    <div className="dashboard-overview">
      <div className="overview-header">
        <h1>Welcome back, {userName}!</h1>
        <p>Here's your integrated learning dashboard</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card gamification">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <h3>Level {crossPhaseData.gamification?.level}</h3>
            <p>{crossPhaseData.gamification?.points} points</p>
            <div className="stat-detail">
              {crossPhaseData.gamification?.achievements?.length} achievements
            </div>
          </div>
        </div>
        
        <div className="stat-card ai-insights">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <h3>AI Insights</h3>
            <p>{crossPhaseData.ai_insights?.learningStyle} learner</p>
            <div className="stat-detail">
              {crossPhaseData.ai_insights?.recommendations?.length} recommendations
            </div>
          </div>
        </div>
        
        <div className="stat-card communication">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <h3>Communication</h3>
            <p>{crossPhaseData.communication?.unreadMessages} unread</p>
            <div className="stat-detail">
              {crossPhaseData.communication?.activeGroups} active groups
            </div>
          </div>
        </div>
        
        <div className="stat-card wellbeing">
          <div className="stat-icon">💚</div>
          <div className="stat-content">
            <h3>Wellbeing Score</h3>
            <p>{crossPhaseData.wellbeing?.currentScore}/100</p>
            <div className="stat-detail">
              {crossPhaseData.wellbeing?.riskLevel} risk level
            </div>
          </div>
        </div>
        
        <div className="stat-card assessment">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>Portfolio</h3>
            <p>{crossPhaseData.assessment?.portfolioItems} items</p>
            <div className="stat-detail">
              {crossPhaseData.assessment?.pendingReviews} pending reviews
            </div>
          </div>
        </div>
        
        <div className="stat-card innovation">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <h3>Innovation</h3>
            <p>{crossPhaseData.innovation?.activeProjects} projects</p>
            <div className="stat-detail">
              {crossPhaseData.innovation?.labAccess?.length} lab access
            </div>
          </div>
        </div>
      </div>
      
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {notifications.slice(0, 5).map(notification => (
            <div 
              key={notification.id} 
              className="activity-item"
              onClick={() => handleNotificationAction(notification)}
            >
              <div className="activity-icon">
                {notification.phase === 'PHASE_1' && '🎮'}
                {notification.phase === 'PHASE_2' && '🤖'}
                {notification.phase === 'PHASE_3' && '💬'}
                {notification.phase === 'PHASE_4' && '💚'}
                {notification.phase === 'PHASE_5' && '🚀'}
              </div>
              <div className="activity-content">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <span className="activity-time">
                  {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className={`activity-priority ${notification.priority}`}>
                {notification.priority}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardOverview()
      case 'phase-phase_5':
      case 'innovation':
        return <AdvancedInnovationDashboard userRole={userRole} userId={userId} />
      case 'wellbeing':
        return <MentalHealthSupportInterface userId={userId} userRole={userRole} />
      case 'achievements':
        return <div className="placeholder">🏆 Achievements Dashboard (Phase 1 Integration)</div>
      case 'ai-tutor':
        return <div className="placeholder">🤖 AI Tutor Interface (Phase 2 Integration)</div>
      case 'communication':
        return <div className="placeholder">💬 Communication Hub (Phase 3 Integration)</div>
      case 'portfolio':
        return <div className="placeholder">📁 Digital Portfolio (Phase 5 Integration)</div>
      default:
        return renderDashboardOverview()
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing your integrated dashboard...</p>
      </div>
    )
  }

  return (
    <div className="enhanced-dashboard-integration">
      <UnifiedNavigationSystem 
        userRole={userRole}
        userId={userId}
        currentPage={currentView}
        onNavigate={handleNavigation}
      />
      
      <div className="main-content">
        {renderCurrentView()}
      </div>
      
      <style jsx>{`
        .enhanced-dashboard-integration {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .main-content {
          flex: 1;
          overflow-y: auto;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f8fafc;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .dashboard-overview {
          padding: 32px;
        }
        
        .overview-header {
          margin-bottom: 32px;
        }
        
        .overview-header h1 {
          color: #1e40af;
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 700;
        }
        
        .overview-header p {
          color: #6b7280;
          margin: 0;
          font-size: 16px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
        }
        
        .stat-icon {
          font-size: 32px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f0f9ff;
        }
        
        .stat-content h3 {
          margin: 0 0 4px 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
        }
        
        .stat-content p {
          margin: 0 0 8px 0;
          color: #3b82f6;
          font-size: 16px;
          font-weight: 500;
        }
        
        .stat-detail {
          color: #6b7280;
          font-size: 14px;
        }
        
        .recent-activity {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .recent-activity h2 {
          color: #1e40af;
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
        }
        
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: 8px;
          background: #f9fafb;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .activity-item:hover {
          background: #f3f4f6;
        }
        
        .activity-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: white;
        }
        
        .activity-content {
          flex: 1;
        }
        
        .activity-content h4 {
          margin: 0 0 4px 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
        }
        
        .activity-content p {
          margin: 0 0 4px 0;
          color: #6b7280;
          font-size: 13px;
        }
        
        .activity-time {
          color: #9ca3af;
          font-size: 12px;
        }
        
        .activity-priority {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .activity-priority.high {
          background: #fecaca;
          color: #991b1b;
        }
        
        .activity-priority.medium {
          background: #fef3c7;
          color: #92400e;
        }
        
        .activity-priority.low {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: white;
          margin: 32px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          font-size: 18px;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default EnhancedDashboardIntegration
