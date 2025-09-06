'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import SmartAnalyticsDashboard from './SmartAnalyticsDashboard'
import { PWAManager } from '@/lib/pwaUtils'
import { SmartSearchEngine } from '@/lib/searchEngine'
import { ReportTemplateEngine, ExportEngine } from '@/lib/reportGenerator'
import { GamificationManager } from '@/lib/gamificationEngine'
import { 
  Search, 
  Download, 
  Trophy, 
  Zap, 
  Wifi, 
  WifiOff, 
  Bell, 
  Settings,
  Filter,
  BarChart3,
  Users,
  BookOpen,
  Calendar,
  Target,
  Award,
  TrendingUp,
  AlertTriangle,
  Star,
  Crown,
  Gamepad2
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'

export default function SmartDashboardIntegration({ 
  userRole = 'teacher', 
  userData = {}, 
  studentData = [], 
  classData = {} 
}) {
  // PWA and Offline Management
  const [pwaManager] = useState(() => new PWAManager())
  const [isOnline, setIsOnline] = useState(true)
  const [isInstallable, setIsInstallable] = useState(false)
  const [notifications, setNotifications] = useState([])

  // Search and Filtering
  const [searchEngine] = useState(() => new SmartSearchEngine(studentData, {
    searchFields: ['name', 'studentId', 'class'],
    filterableFields: ['class', 'grade', 'status', 'riskLevel'],
    autocompleteFields: ['name', 'class']
  }))
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ results: [], total: 0 })
  const [activeFilters, setActiveFilters] = useState([])

  // Gamification
  const [gamificationManager] = useState(() => new GamificationManager())
  const [gamificationData, setGamificationData] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [achievements, setAchievements] = useState([])

  // Dashboard State
  const [activeView, setActiveView] = useState('overview')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [reportGenerating, setReportGenerating] = useState(false)

  // Initialize PWA features
  useEffect(() => {
    pwaManager.onOnline = () => {
      setIsOnline(true)
      showNotification('Connection Restored', { 
        body: 'You are back online!', 
        icon: '🌐' 
      })
    }

    pwaManager.onOffline = () => {
      setIsOnline(false)
      showNotification('Connection Lost', { 
        body: 'Working in offline mode', 
        icon: '📱' 
      })
    }

    pwaManager.installer.onInstallable = () => {
      setIsInstallable(true)
    }

    // Request notification permission
    pwaManager.requestNotificationPermission()
  }, [pwaManager])

  // Process gamification data
  useEffect(() => {
    if (userRole === 'student' && userData) {
      const processed = gamificationManager.processStudentData(userData)
      setGamificationData(processed)
    }
  }, [userData, userRole, gamificationManager])

  // Update search results
  useEffect(() => {
    const results = searchEngine.search(searchQuery, activeFilters)
    setSearchResults(results)
  }, [searchQuery, activeFilters, searchEngine])

  const showNotification = (title, options = {}) => {
    if (pwaManager.notificationManager.permission === 'granted') {
      pwaManager.showNotification(title, options)
    }
    
    // Also add to in-app notifications
    const notification = {
      id: Date.now(),
      title,
      message: options.body || '',
      timestamp: new Date(),
      type: options.type || 'info'
    }
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep last 5
  }

  const handleInstallApp = async () => {
    const installed = await pwaManager.showInstallPrompt()
    if (installed) {
      showNotification('App Installed', { 
        body: 'School Management System is now installed!',
        icon: '🎉'
      })
    }
  }

  const handleGenerateReport = async (templateType, data) => {
    setReportGenerating(true)
    try {
      const template = ReportTemplateEngine.getTemplate(templateType)
      if (!template) {
        throw new Error('Template not found')
      }

      const processedTemplate = ReportTemplateEngine.processTemplate(template, data)
      const exportResult = await ExportEngine.exportReport(processedTemplate, 'html')
      
      // Create download link
      const blob = new Blob([exportResult.content], { type: exportResult.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportResult.filename
      a.click()
      URL.revokeObjectURL(url)

      showNotification('Report Generated', { 
        body: `${template.title} has been downloaded`,
        icon: '📊'
      })
    } catch (error) {
      console.error('Report generation failed:', error)
      showNotification('Report Failed', { 
        body: 'Failed to generate report',
        icon: '❌',
        type: 'error'
      })
    } finally {
      setReportGenerating(false)
    }
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
  }

  const handleFilterAdd = (filter) => {
    setActiveFilters(prev => [...prev, filter])
  }

  const handleFilterRemove = (index) => {
    setActiveFilters(prev => prev.filter((_, i) => i !== index))
  }

  const renderGamificationPanel = () => {
    if (userRole !== 'student' || !gamificationData.achievements) return null

    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
            Your Progress
          </h3>
          <div className="flex items-center space-x-2">
            <Crown className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">
              Level {gamificationData.level?.level || 1} - {gamificationData.level?.name || 'Beginner'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{gamificationData.totalPoints || 0}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {gamificationData.achievements?.earnedAchievements?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Achievements</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{gamificationData.nextLevelPoints || 0}</div>
            <div className="text-sm text-gray-600">To Next Level</div>
          </div>
        </div>

        {gamificationData.achievements?.earnedAchievements?.slice(0, 3).map((achievement, index) => (
          <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded-lg mb-2">
            <span className="text-2xl">{achievement.achievement.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{achievement.achievement.name}</div>
              <div className="text-sm text-gray-600">{achievement.level} Level</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-yellow-600">+{achievement.points}</div>
            </div>
          </div>
        ))}
      </Card>
    )
  }

  const renderSearchAndFilter = () => (
    <Card className="p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search students, classes, or subjects..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button className="btn-secondary btn-sm">
            <Filter className="w-4 h-4" />
            Filters ({activeFilters.length})
          </Button>
          
          <Button 
            onClick={() => handleGenerateReport('class_performance', { class: classData, students: studentData })}
            disabled={reportGenerating}
            className="btn-primary btn-sm"
          >
            <Download className="w-4 h-4" />
            {reportGenerating ? 'Generating...' : 'Export'}
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeFilters.map((filter, index) => (
            <span 
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
            >
              {filter.field}: {filter.value}
              <button 
                onClick={() => handleFilterRemove(index)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </Card>
  )

  const renderQuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold">{studentData.length}</p>
          </div>
          <Users className="w-8 h-8 text-blue-500" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Average Grade</p>
            <p className="text-2xl font-bold">
              {studentData.length > 0 
                ? Math.round(studentData.reduce((sum, s) => sum + (s.averageGrade || 0), 0) / studentData.length)
                : 0}%
            </p>
          </div>
          <BarChart3 className="w-8 h-8 text-green-500" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Attendance Rate</p>
            <p className="text-2xl font-bold">
              {studentData.length > 0 
                ? Math.round(studentData.reduce((sum, s) => sum + (s.attendanceRate || 0), 0) / studentData.length)
                : 0}%
            </p>
          </div>
          <Calendar className="w-8 h-8 text-purple-500" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">At Risk</p>
            <p className="text-2xl font-bold text-red-600">
              {studentData.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length}
            </p>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
      </Card>
    </div>
  )

  const renderNotifications = () => (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center">
          <Bell className="w-4 h-4 mr-2" />
          Recent Notifications
        </h3>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm text-gray-600">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">No recent notifications</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div key={notification.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
              <div className="flex-1">
                <div className="font-medium text-sm">{notification.title}</div>
                <div className="text-xs text-gray-600">{notification.message}</div>
              </div>
              <div className="text-xs text-gray-500">
                {notification.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {isInstallable && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Install App</div>
              <div className="text-xs text-gray-600">Get the full experience</div>
            </div>
            <Button onClick={handleInstallApp} className="btn-primary btn-sm">
              Install
            </Button>
          </div>
        </div>
      )}
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header with PWA status and quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Dashboard</h1>
          <p className="text-gray-600">AI-powered insights and analytics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button className="btn-ghost btn-sm">
            <Settings className="w-4 h-4" />
          </Button>
          
          {userRole === 'student' && (
            <Button className="btn-secondary btn-sm">
              <Gamepad2 className="w-4 h-4" />
              Games
            </Button>
          )}
        </div>
      </div>

      {/* Notifications and PWA status */}
      {renderNotifications()}

      {/* Gamification panel for students */}
      {renderGamificationPanel()}

      {/* Search and filtering */}
      {renderSearchAndFilter()}

      {/* Quick stats */}
      {renderQuickStats()}

      {/* Main analytics dashboard */}
      <SmartAnalyticsDashboard 
        studentData={searchResults.results.length > 0 ? searchResults.results : studentData}
        classData={classData}
        userRole={userRole}
      />

      {/* Search results if active */}
      {searchQuery && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Search Results ({searchResults.total})
          </h3>
          
          {searchResults.results.length === 0 ? (
            <p className="text-gray-500">No results found for "{searchQuery}"</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.results.slice(0, 9).map(student => (
                <div 
                  key={student.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-gray-600">{student.class}</div>
                  <div className="text-sm text-gray-500">ID: {student.studentId}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
