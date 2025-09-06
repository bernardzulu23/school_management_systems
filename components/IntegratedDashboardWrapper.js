import React, { useState, useEffect } from 'react'
import { PhaseIntegrationSystem } from '../lib/phaseIntegrationSystem'
import EnhancedDashboardIntegration from './EnhancedDashboardIntegration'
import ComprehensiveSettingsPanel from './ComprehensiveSettingsPanel'
import AdvancedInnovationDashboard from './AdvancedInnovationDashboard'
import MentalHealthSupportInterface from './MentalHealthSupportInterface'
import CommunicationDashboard from './CommunicationDashboard'
import WellbeingDashboard from './WellbeingDashboard'
import AccessibilityDashboard from './AccessibilityDashboard'

/**
 * Integrated Dashboard Wrapper
 * Main entry point for the fully integrated school management system
 * Connects all 5 phases with role-based access and unified navigation
 */
const IntegratedDashboardWrapper = ({ userRole, userId, userName, userData }) => {
  const [currentView, setCurrentView] = useState('dashboard')
  const [integration, setIntegration] = useState(null)
  const [userSettings, setUserSettings] = useState({})
  const [phaseData, setPhaseData] = useState({})
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    initializeIntegratedSystem()
  }, [userRole, userId])

  const initializeIntegratedSystem = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log(`Initializing integrated system for ${userRole} ${userId}`)
      
      // Initialize phase integration system
      const userIntegration = PhaseIntegrationSystem.initializeIntegration(userId, userRole)
      setIntegration(userIntegration)
      
      // Load all phase data
      await loadAllPhaseData(userIntegration)
      
      // Load user settings
      await loadUserSettings()
      
      // Setup cross-phase notifications
      await setupNotifications(userIntegration)
      
      // Sync cross-phase data
      PhaseIntegrationSystem.syncCrossPhaseData(userId)
      
      setLoading(false)
      console.log('Integrated system initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize integrated system:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  const loadAllPhaseData = async (userIntegration) => {
    const data = {}
    
    // Load Phase 1: Gamification & Analytics
    if (userIntegration.enabledPhases.includes('PHASE_1')) {
      data.phase1 = await loadPhase1Data()
    }
    
    // Load Phase 2: AI-Powered Features
    if (userIntegration.enabledPhases.includes('PHASE_2')) {
      data.phase2 = await loadPhase2Data()
    }
    
    // Load Phase 3: Communication & Collaboration
    if (userIntegration.enabledPhases.includes('PHASE_3')) {
      data.phase3 = await loadPhase3Data()
    }
    
    // Load Phase 4: Wellbeing & Accessibility
    if (userIntegration.enabledPhases.includes('PHASE_4')) {
      data.phase4 = await loadPhase4Data()
    }
    
    // Load Phase 5: Advanced Assessment & Innovation
    if (userIntegration.enabledPhases.includes('PHASE_5')) {
      data.phase5 = await loadPhase5Data()
    }
    
    setPhaseData(data)
  }

  const loadPhase1Data = async () => {
    // Simulate loading gamification and analytics data
    return {
      gamification: {
        level: 8,
        points: 1250,
        achievements: ['First Assignment', 'Perfect Attendance', 'Team Player'],
        streaks: { daily_login: 15, assignment_completion: 7 },
        leaderboard_position: 12
      },
      analytics: {
        performance_trend: 'improving',
        subject_strengths: ['Mathematics', 'Science'],
        areas_for_improvement: ['Writing', 'Time Management'],
        predicted_grades: { math: 'A', science: 'A-', english: 'B+' }
      }
    }
  }

  const loadPhase2Data = async () => {
    // Simulate loading AI-powered features data
    return {
      ai_tutor: {
        active_sessions: 3,
        recommendations: ['Review algebra concepts', 'Practice essay writing'],
        learning_style: 'Visual',
        adaptation_level: 'Intermediate'
      },
      personalized_paths: {
        current_path: 'Advanced Mathematics',
        progress: 65,
        next_milestone: 'Calculus Fundamentals',
        estimated_completion: '2024-03-15'
      }
    }
  }

  const loadPhase3Data = async () => {
    // Simulate loading communication and collaboration data
    return {
      communication: {
        unread_messages: 5,
        active_groups: 8,
        recent_activity: ['New message in Study Group', 'Project update'],
        online_friends: 12
      },
      collaboration: {
        active_projects: 3,
        team_invitations: 1,
        shared_resources: 15,
        peer_reviews_pending: 2
      }
    }
  }

  const loadPhase4Data = async () => {
    // Simulate loading wellbeing and accessibility data
    return {
      wellbeing: {
        current_score: 78,
        risk_level: 'LOW',
        last_assessment: '2024-01-28',
        intervention_plans: [],
        support_resources: 5
      },
      accessibility: {
        active_accommodations: ['Large Text', 'High Contrast'],
        assistive_tech: ['Screen Reader Support'],
        customizations: { font_size: 'large', theme: 'high_contrast' }
      }
    }
  }

  const loadPhase5Data = async () => {
    // Simulate loading advanced assessment and innovation data
    return {
      assessment: {
        digital_portfolios: 2,
        competency_assessments: 5,
        peer_reviews: 3,
        blockchain_certificates: 1
      },
      innovation: {
        lab_projects: 2,
        ar_vr_experiences: 4,
        voice_interactions: 15,
        iot_connections: 3
      }
    }
  }

  const loadUserSettings = async () => {
    // Simulate loading user settings
    const settings = {
      theme: 'blue_white',
      accessibility: {
        high_contrast: false,
        large_text: true,
        voice_interface: true
      },
      notifications: {
        email: true,
        push: true,
        in_app: true
      },
      privacy: {
        data_sharing: 'limited',
        public_profile: false
      }
    }
    
    setUserSettings(settings)
  }

  const setupNotifications = async (userIntegration) => {
    // Simulate setting up cross-phase notifications
    const crossPhaseNotifications = [
      {
        id: 1,
        phase: 'PHASE_1',
        type: 'achievement',
        message: 'New badge earned: Collaboration Master!',
        priority: 'medium',
        timestamp: new Date()
      },
      {
        id: 2,
        phase: 'PHASE_4',
        type: 'wellbeing',
        message: 'Weekly wellbeing check-in reminder',
        priority: 'high',
        timestamp: new Date()
      },
      {
        id: 3,
        phase: 'PHASE_5',
        type: 'innovation',
        message: 'New AR experience available: Virtual Chemistry Lab',
        priority: 'low',
        timestamp: new Date()
      }
    ]
    
    setNotifications(crossPhaseNotifications)
  }

  const handleViewChange = (newView) => {
    setCurrentView(newView)
  }

  const handleSettingsChange = (newSettings) => {
    setUserSettings(newSettings)
    // Apply settings across all phases
    applySettingsAcrossPhases(newSettings)
  }

  const applySettingsAcrossPhases = (settings) => {
    // Apply accessibility settings
    if (settings.accessibility) {
      // Apply to all phase components
      console.log('Applying accessibility settings across all phases')
    }
    
    // Apply theme settings
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme)
    }
    
    // Apply notification preferences
    if (settings.notifications) {
      console.log('Updating notification preferences across all phases')
    }
  }

  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Initializing Integrated System...</h2>
          <p>Loading all phase features and user data</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="error-container">
          <h2>System Error</h2>
          <p>{error}</p>
          <button onClick={initializeIntegratedSystem}>Retry</button>
        </div>
      )
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <EnhancedDashboardIntegration 
            userRole={userRole}
            userId={userId}
            userName={userName}
            phaseData={phaseData}
            notifications={notifications}
          />
        )
      case 'settings':
        return (
          <ComprehensiveSettingsPanel 
            userRole={userRole}
            userId={userId}
            onSettingsChange={handleSettingsChange}
          />
        )
      case 'innovation':
        return (
          <AdvancedInnovationDashboard 
            userRole={userRole}
            userId={userId}
          />
        )
      case 'wellbeing':
        return (
          <MentalHealthSupportInterface 
            userId={userId}
            userRole={userRole}
          />
        )
      case 'communication':
        return (
          <CommunicationDashboard 
            userRole={userRole}
            userId={userId}
          />
        )
      case 'accessibility':
        return (
          <AccessibilityDashboard 
            userRole={userRole}
            userId={userId}
          />
        )
      default:
        return (
          <EnhancedDashboardIntegration 
            userRole={userRole}
            userId={userId}
            userName={userName}
            phaseData={phaseData}
            notifications={notifications}
          />
        )
    }
  }

  return (
    <div className="integrated-dashboard-wrapper">
      {renderCurrentView()}
      
      <style jsx>{`
        .integrated-dashboard-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          text-align: center;
          padding: 32px;
        }
        
        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 6px solid #e5e7eb;
          border-top: 6px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 24px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-container h2, .error-container h2 {
          color: #1e40af;
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        .loading-container p, .error-container p {
          color: #6b7280;
          margin: 0 0 24px 0;
          font-size: 16px;
        }
        
        .error-container button {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .error-container button:hover {
          transform: translateY(-2px);
        }
        
        /* Global theme variables */
        :global([data-theme="blue_white"]) {
          --primary-color: #3b82f6;
          --secondary-color: #1e40af;
          --background-color: #ffffff;
          --text-color: #1f2937;
        }
        
        :global([data-theme="dark"]) {
          --primary-color: #60a5fa;
          --secondary-color: #3b82f6;
          --background-color: #1f2937;
          --text-color: #f9fafb;
        }
        
        :global([data-theme="high_contrast"]) {
          --primary-color: #000000;
          --secondary-color: #ffffff;
          --background-color: #ffffff;
          --text-color: #000000;
        }
      `}</style>
    </div>
  )
}

export default IntegratedDashboardWrapper
