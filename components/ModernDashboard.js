import React, { useState, useEffect } from 'react'
import { GamificationManager } from '../lib/gamificationEngine'
import { PredictiveAnalyticsEngine } from '../lib/aiAnalyticsEngine'
import { WellbeingMonitoringSystem } from '../lib/wellbeingSystem'
import { IntelligentLearningAssistant } from '../lib/intelligentLearningAssistant'
import { PersonalizedLearningPaths } from '../lib/personalizedLearningPaths'
import { ModernAssessmentSystem } from '../lib/modernAssessmentSystem'
import { EmergingTechIntegration } from '../lib/emergingTechIntegration'

/**
 * Modern Dashboard Component
 * Integrates all advanced features into a unified interface
 */
export default function ModernDashboard({ userRole, userId, userData }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [activeWidgets, setActiveWidgets] = useState([])
  const [voiceInterface, setVoiceInterface] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [wellbeingStatus, setWellbeingStatus] = useState(null)
  const [learningAssistant, setLearningAssistant] = useState(null)

  useEffect(() => {
    initializeDashboard()
    setupVoiceInterface()
    loadWellbeingData()
  }, [userId, userRole])

  const initializeDashboard = async () => {
    try {
      // Initialize gamification data
      const gamificationData = GamificationManager.prototype.processStudentData(userData)
      
      // Get predictive analytics
      const analyticsData = PredictiveAnalyticsEngine.predictAcademicPerformance(userData)
      
      // Load personalized learning paths
      const learningPaths = PersonalizedLearningPaths.createPersonalizedPath(
        userData, 
        userData.primarySubject || 'Mathematics',
        { targetLevel: 'ADVANCED' }
      )

      setDashboardData({
        gamification: gamificationData,
        analytics: analyticsData,
        learningPaths: learningPaths,
        lastUpdated: new Date()
      })

      // Set default active widgets based on user role
      setActiveWidgets(getDefaultWidgets(userRole))
    } catch (error) {
      console.error('Error initializing dashboard:', error)
    }
  }

  const setupVoiceInterface = () => {
    const voiceConfig = EmergingTechIntegration.initializeVoiceInterface({
      userId: userId,
      language: 'en-US',
      accessibilityMode: userData.accessibilityNeeds || false
    })
    setVoiceInterface(voiceConfig)
  }

  const loadWellbeingData = async () => {
    try {
      const assessment = WellbeingMonitoringSystem.createWellbeingAssessment(userId, 'DAILY')
      setWellbeingStatus(assessment)
    } catch (error) {
      console.error('Error loading wellbeing data:', error)
    }
  }

  const handleVoiceCommand = async () => {
    if (!voiceInterface) return

    setIsListening(true)
    try {
      // Mock voice input - in production would use Web Speech API
      const mockVoiceInput = { duration: 2.5, audioData: 'mock_audio' }
      const result = EmergingTechIntegration.processVoiceCommand(
        mockVoiceInput, 
        { page: 'dashboard', userRole: userRole }
      )
      
      if (result.action) {
        await executeVoiceAction(result.action)
      }
      
      // Provide voice feedback
      if (result.response) {
        speakResponse(result.response.message)
      }
    } catch (error) {
      console.error('Voice command error:', error)
      speakResponse("Sorry, I couldn't process that command.")
    } finally {
      setIsListening(false)
    }
  }

  const executeVoiceAction = async (action) => {
    switch (action.action) {
      case 'navigate':
        window.location.href = action.target
        break
      case 'ai_explain':
        const session = IntelligentLearningAssistant.createLearningSession(
          userId, 
          'CONCEPT_EXPLANATION', 
          'Explain current topic'
        )
        setLearningAssistant(session)
        break
      case 'generate_quiz':
        // Generate quiz based on current subject
        break
      case 'accessibility':
        handleAccessibilityAction(action)
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  const handleAccessibilityAction = (action) => {
    switch (action.setting) {
      case 'font_size_up':
        document.body.style.fontSize = '1.2em'
        break
      case 'high_contrast':
        document.body.classList.toggle('high-contrast')
        break
      case 'voice_nav_enable':
        // Enable voice navigation
        break
    }
  }

  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  const getDefaultWidgets = (role) => {
    const commonWidgets = ['wellbeing', 'gamification', 'voice_assistant']
    
    switch (role) {
      case 'student':
        return [...commonWidgets, 'learning_paths', 'skill_trees', 'achievements', 'study_groups']
      case 'teacher':
        return [...commonWidgets, 'class_analytics', 'student_progress', 'assessment_tools']
      case 'headteacher':
        return [...commonWidgets, 'school_analytics', 'performance_overview', 'system_health']
      default:
        return commonWidgets
    }
  }

  const renderWidget = (widgetType) => {
    switch (widgetType) {
      case 'wellbeing':
        return <WellbeingWidget status={wellbeingStatus} userId={userId} />
      case 'gamification':
        return <GamificationWidget data={dashboardData?.gamification} />
      case 'voice_assistant':
        return <VoiceAssistantWidget 
          isListening={isListening} 
          onVoiceCommand={handleVoiceCommand}
          assistant={learningAssistant}
        />
      case 'learning_paths':
        return <LearningPathsWidget paths={dashboardData?.learningPaths} />
      case 'skill_trees':
        return <SkillTreeWidget data={dashboardData?.gamification?.skillTrees} />
      case 'achievements':
        return <AchievementsWidget 
          achievements={dashboardData?.gamification?.achievements}
          nfts={dashboardData?.gamification?.nftCollection}
        />
      case 'analytics':
        return <AnalyticsWidget data={dashboardData?.analytics} />
      default:
        return <div>Widget not found: {widgetType}</div>
    }
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading your personalized dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userData.name}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                Your intelligent learning companion is ready to help
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Voice Assistant Button */}
              <button
                onClick={handleVoiceCommand}
                className={`p-3 rounded-full transition-all duration-200 ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Voice Assistant"
              >
                🎤
              </button>
              
              {/* Wellbeing Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  wellbeingStatus?.riskLevel === 'LOW' ? 'bg-green-500' :
                  wellbeingStatus?.riskLevel === 'MEDIUM' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">Wellbeing</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Learning Progress"
            value={`${Math.round(dashboardData.gamification?.level || 0)}`}
            subtitle="Current Level"
            icon="📈"
            color="blue"
          />
          <StatCard
            title="Skill Points"
            value={dashboardData.gamification?.totalPoints || 0}
            subtitle="Total Earned"
            icon="⭐"
            color="yellow"
          />
          <StatCard
            title="Achievements"
            value={dashboardData.gamification?.achievements?.length || 0}
            subtitle="Unlocked"
            icon="🏆"
            color="green"
          />
          <StatCard
            title="NFT Collection"
            value={dashboardData.gamification?.nftCollection?.length || 0}
            subtitle="Rare Items"
            icon="💎"
            color="purple"
          />
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeWidgets.map((widget, index) => (
            <div key={widget} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              {renderWidget(widget)}
            </div>
          ))}
        </div>

        {/* AI Predictions & Recommendations */}
        {dashboardData.analytics && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🤖 AI Insights & Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Performance Prediction</h4>
                <p className="text-gray-600">
                  Expected GPA: <span className="font-bold text-blue-600">
                    {dashboardData.analytics.prediction?.expectedGPA?.toFixed(2) || 'N/A'}
                  </span>
                </p>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(dashboardData.analytics.prediction?.confidence || 0) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {Math.round((dashboardData.analytics.prediction?.confidence || 0) * 100)}%
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {dashboardData.analytics.recommendations?.slice(0, 3).map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {rec.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Widget Components
const StatCard = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-gray-500 text-xs">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]} text-white text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const WellbeingWidget = ({ status, userId }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">🌟 Wellbeing Check</h3>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Overall Status</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status?.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
          status?.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {status?.riskLevel || 'Unknown'}
        </span>
      </div>
      <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
        Take Daily Check-in
      </button>
    </div>
  </div>
)

const GamificationWidget = ({ data }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">🎮 Your Progress</h3>
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Level {data?.level || 1}</span>
          <span>{data?.nextLevelPoints || 0} XP to next level</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: '65%' }}
          ></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600">{data?.totalPoints || 0}</p>
          <p className="text-xs text-gray-500">Total Points</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-600">{data?.achievements?.length || 0}</p>
          <p className="text-xs text-gray-500">Achievements</p>
        </div>
      </div>
    </div>
  </div>
)

const VoiceAssistantWidget = ({ isListening, onVoiceCommand, assistant }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">🎤 Voice Assistant</h3>
    <div className="text-center">
      <button
        onClick={onVoiceCommand}
        className={`w-16 h-16 rounded-full mx-auto mb-3 transition-all duration-200 ${
          isListening 
            ? 'bg-red-500 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white text-2xl`}
      >
        🎤
      </button>
      <p className="text-sm text-gray-600">
        {isListening ? 'Listening...' : 'Click to speak'}
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Try: "Show my grades" or "Help me study"
      </p>
    </div>
  </div>
)

const LearningPathsWidget = ({ paths }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">🛤️ Learning Paths</h3>
    <div className="space-y-3">
      <div className="bg-blue-50 rounded-lg p-3">
        <h4 className="font-medium text-blue-900">{paths?.subject || 'Mathematics'}</h4>
        <p className="text-sm text-blue-700">
          Progress: {Math.round(paths?.progress?.overallProgress || 0)}%
        </p>
        <div className="bg-blue-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${paths?.progress?.overallProgress || 0}%` }}
          ></div>
        </div>
      </div>
      <button className="w-full text-blue-600 text-sm hover:text-blue-800 transition-colors">
        View All Paths →
      </button>
    </div>
  </div>
)

const SkillTreeWidget = ({ data }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">🌳 Skill Trees</h3>
    <div className="space-y-2">
      {Object.entries(data || {}).slice(0, 3).map(([category, progress]) => (
        <div key={category} className="flex justify-between items-center">
          <span className="text-sm text-gray-600 capitalize">{category}</span>
          <span className="text-xs text-gray-500">
            {progress.masteredSkills || 0}/{progress.totalSkills || 0}
          </span>
        </div>
      ))}
      <button className="w-full text-green-600 text-sm hover:text-green-800 transition-colors">
        Explore Skills →
      </button>
    </div>
  </div>
)

const AchievementsWidget = ({ achievements, nfts }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Recent Achievements</h3>
    <div className="space-y-2">
      {achievements?.slice(0, 3).map((achievement, index) => (
        <div key={index} className="flex items-center space-x-2">
          <span className="text-lg">{achievement.badge || '🏅'}</span>
          <span className="text-sm text-gray-600">{achievement.name}</span>
        </div>
      ))}
      {nfts?.length > 0 && (
        <div className="mt-3 p-2 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-700">
            💎 {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} collected
          </p>
        </div>
      )}
    </div>
  </div>
)

const AnalyticsWidget = ({ data }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Performance Analytics</h3>
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-gray-600">Risk Level</span>
        <span className={`px-2 py-1 rounded-full text-xs ${
          data?.prediction?.riskLevel?.level === 'low' ? 'bg-green-100 text-green-800' :
          data?.prediction?.riskLevel?.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {data?.prediction?.riskLevel?.level || 'Unknown'}
        </span>
      </div>
      <div>
        <p className="text-sm text-gray-600">Predicted GPA</p>
        <p className="text-xl font-bold text-blue-600">
          {data?.prediction?.expectedGPA?.toFixed(2) || 'N/A'}
        </p>
      </div>
    </div>
  </div>
)
