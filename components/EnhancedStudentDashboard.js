/**
 * Enhanced Student Dashboard
 * Comprehensive dashboard with all advanced educational features
 * Integrates digital library, study groups, learning assessment, goals, and more
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  DigitalLibrarySystem,
  PeerStudyGroupSystem,
  LearningStyleAssessment,
  AcademicGoalSystem,
  HomeworkReminderSystem,
} from '../lib/advancedStudentFeatures.js'
import { StudyTimeTracker, SubjectCalculatorSystem } from '../lib/studyProductivityTools.js'
import { DigitalNotebookSystem, ResearchProjectManager } from '../lib/digitalNotebookSystem.js'

const EnhancedStudentDashboard = ({ studentId, studentData }) => {
  // System instances
  const [digitalLibrary] = useState(() => new DigitalLibrarySystem())
  const [studyGroups] = useState(() => new PeerStudyGroupSystem())
  const [learningAssessment] = useState(() => new LearningStyleAssessment())
  const [goalSystem] = useState(() => new AcademicGoalSystem())
  const [homeworkReminder] = useState(() => new HomeworkReminderSystem())
  const [timeTracker] = useState(() => new StudyTimeTracker())
  const [calculatorSystem] = useState(() => new SubjectCalculatorSystem())
  const [notebookSystem] = useState(() => new DigitalNotebookSystem())
  const [projectManager] = useState(() => new ResearchProjectManager())

  // Dashboard state
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardData, setDashboardData] = useState({
    recentBooks: [],
    activeGoals: [],
    upcomingAssignments: [],
    studyStats: null,
    learningProfile: null,
    recentNotes: [],
    activeProjects: [],
  })

  // Loading and notification states
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)

    try {
      // Load data from all systems
      const [goals, assignments, studyStats, learningProfile, notebooks, projects] =
        await Promise.all([
          goalSystem.getStudentGoals(studentId, 'active'),
          homeworkReminder.getUpcomingAssignments(studentId),
          timeTracker.getStudentStats(studentId),
          learningAssessment.getStudentProfile(studentId),
          notebookSystem.getStudentNotebooks(studentId),
          projectManager.getStudentProjects(studentId, 'in_progress'),
        ])

      setDashboardData({
        activeGoals: goals.slice(0, 5),
        upcomingAssignments: assignments.slice(0, 5),
        studyStats,
        learningProfile,
        recentNotes: notebooks.slice(0, 3),
        activeProjects: projects.slice(0, 3),
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [
    studentId,
    goalSystem,
    homeworkReminder,
    timeTracker,
    learningAssessment,
    notebookSystem,
    projectManager,
  ])

  const checkNotifications = useCallback(() => {
    const newNotifications = []

    // Check homework reminders
    const pendingReminders = homeworkReminder.checkPendingReminders()
    pendingReminders.forEach(({ reminder, assignment }) => {
      const message = homeworkReminder.sendReminder(reminder, assignment)
      newNotifications.push({
        id: `reminder_${reminder.id}`,
        type: 'homework',
        message,
        timestamp: new Date(),
        priority: 'medium',
      })
    })

    // Check goal deadlines
    dashboardData.activeGoals.forEach((goal) => {
      const daysUntilDeadline = Math.ceil((goal.targetDate - new Date()) / (24 * 60 * 60 * 1000))
      if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
        newNotifications.push({
          id: `goal_${goal.id}`,
          type: 'goal',
          message: `🎯 Goal "${goal.title}" is due in ${daysUntilDeadline} days`,
          timestamp: new Date(),
          priority: 'high',
        })
      }
    })

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev].slice(0, 10))
    }
  }, [dashboardData.activeGoals, homeworkReminder])

  useEffect(() => {
    loadDashboardData()
    checkNotifications()

    // Set up periodic checks
    const interval = setInterval(checkNotifications, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [loadDashboardData, checkNotifications])

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Quick Stats */}
      <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">📊 Study Statistics</h3>
        {dashboardData.studyStats ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Study Time:</span>
              <span className="font-medium">
                {dashboardData.studyStats.totalStudyHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between">
              <span>Study Streak:</span>
              <span className="font-medium">{dashboardData.studyStats.studyStreak} days</span>
            </div>
            <div className="flex justify-between">
              <span>Average Productivity:</span>
              <span className="font-medium">
                {dashboardData.studyStats.averageProductivity.toFixed(1)}/5
              </span>
            </div>
          </div>
        ) : (
          <p className="text-royalPurple-text3">Start studying to see your statistics!</p>
        )}
      </div>

      {/* Active Goals */}
      <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">🎯 Active Goals</h3>
        {dashboardData.activeGoals.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.activeGoals.map((goal) => (
              <div key={goal.id} className="border-l-4 border-royalPurple-border2 pl-3">
                <div className="font-medium text-sm">{goal.title}</div>
                <div className="text-xs text-royalPurple-text2">
                  {goal.progress.toFixed(1)}% complete
                </div>
                <div className="w-full bg-royalPurple-card2 rounded-full h-2 mt-1">
                  <div
                    className="bg-royalPurple-accent h-2 rounded-full"
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-royalPurple-text3">
            No active goals. Set some goals to track your progress!
          </p>
        )}
      </div>

      {/* Upcoming Assignments */}
      <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">
          📝 Upcoming Assignments
        </h3>
        {dashboardData.upcomingAssignments.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.upcomingAssignments.map((assignment) => {
              const daysUntilDue = Math.ceil(
                (assignment.dueDate - new Date()) / (24 * 60 * 60 * 1000)
              )
              return (
                <div key={assignment.id} className="border-l-4 border-royalPurple-accent pl-3">
                  <div className="font-medium text-sm">{assignment.title}</div>
                  <div className="text-xs text-royalPurple-text2">{assignment.subject}</div>
                  <div
                    className={`text-xs ${daysUntilDue <= 1 ? 'text-royalPurple-dangerTx' : 'text-royalPurple-text3'}`}
                  >
                    Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-royalPurple-text3">No upcoming assignments!</p>
        )}
      </div>

      {/* Learning Style */}
      <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">🧠 Learning Style</h3>
        {dashboardData.learningProfile ? (
          <div>
            <div className="text-lg font-medium text-royalPurple-accentTx mb-2">
              {dashboardData.learningProfile.primaryStyle.replace('_', ' ').toUpperCase()}
            </div>
            <div className="text-sm text-royalPurple-text2 mb-3">
              Secondary: {dashboardData.learningProfile.secondaryStyle.replace('_', ' ')}
            </div>
            <div className="text-xs">
              <strong>Today's Tip:</strong>{' '}
              {learningAssessment.getDailyTips(dashboardData.learningProfile.primaryStyle)[0]}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-royalPurple-text3 mb-3">
              Take the learning style assessment to get personalized study tips!
            </p>
            <button
              onClick={() => setActiveTab('learning')}
              className="bg-royalPurple-accent text-royalPurple-text1 px-4 py-2 rounded text-sm hover:bg-royalPurple-accent"
            >
              Take Assessment
            </button>
          </div>
        )}
      </div>

      {/* Recent Notebooks */}
      <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">📓 Recent Notebooks</h3>
        {dashboardData.recentNotes.length > 0 ? (
          <div className="space-y-2">
            {dashboardData.recentNotes.map((notebook) => (
              <div key={notebook.id} className="flex items-center space-x-2">
                <span>{notebook.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{notebook.name}</div>
                  <div className="text-xs text-royalPurple-text2">
                    {notebook.subject} • {notebook.noteCount} notes
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-royalPurple-text3">
            Create your first notebook to start taking notes!
          </p>
        )}
      </div>

      {/* Active Projects */}
      <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">🔬 Active Projects</h3>
        {dashboardData.activeProjects.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.activeProjects.map((project) => (
              <div key={project.id} className="border-l-4 border-royalPurple-border pl-3">
                <div className="font-medium text-sm">{project.title}</div>
                <div className="text-xs text-royalPurple-text2">{project.subject}</div>
                <div className="text-xs text-royalPurple-successTx">
                  {project.progress.toFixed(1)}% complete
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-royalPurple-text3">Start a research project to track your progress!</p>
        )}
      </div>
    </div>
  )

  const renderQuickActions = () => (
    <div className="bg-royalPurple-card rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-royalPurple-text1 mb-4">⚡ Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setActiveTab('study')}
          className="flex flex-col items-center p-4 bg-royalPurple-accent rounded-lg hover:bg-royalPurple-accent transition-colors"
        >
          <span className="text-2xl mb-2">⏱️</span>
          <span className="text-sm font-medium">Start Study Session</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className="flex flex-col items-center p-4 bg-royalPurple-success rounded-lg hover:bg-royalPurple-success transition-colors"
        >
          <span className="text-2xl mb-2">📚</span>
          <span className="text-sm font-medium">Browse Library</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className="flex flex-col items-center p-4 bg-royalPurple-pill rounded-lg hover:bg-royalPurple-pill transition-colors"
        >
          <span className="text-2xl mb-2">🧮</span>
          <span className="text-sm font-medium">Calculators</span>
        </button>

        <button
          onClick={() => setActiveTab('notebook')}
          className="flex flex-col items-center p-4 bg-royalPurple-card2 rounded-lg hover:bg-royalPurple-border transition-colors"
        >
          <span className="text-2xl mb-2">📓</span>
          <span className="text-sm font-medium">Take Notes</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className="flex flex-col items-center p-4 bg-royalPurple-card2 rounded-lg hover:bg-royalPurple-border transition-colors"
        >
          <span className="text-2xl mb-2">👥</span>
          <span className="text-sm font-medium">Study Groups</span>
        </button>

        <button
          onClick={() => setActiveTab('goals')}
          className="flex flex-col items-center p-4 bg-royalPurple-danger rounded-lg hover:bg-royalPurple-danger transition-colors"
        >
          <span className="text-2xl mb-2">🎯</span>
          <span className="text-sm font-medium">Set Goals</span>
        </button>
      </div>
    </div>
  )

  const renderNotifications = () =>
    notifications.length > 0 && (
      <div className="bg-royalPurple-accentBg border-l-4 border-royalPurple-accent p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-royalPurple-accentTx text-xl">🔔</span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-royalPurple-text1">Notifications</h3>
            <div className="mt-2 text-sm text-royalPurple-text2">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="mb-1">
                  {notification.message}
                </div>
              ))}
              {notifications.length > 3 && (
                <div className="text-xs text-royalPurple-text3">
                  +{notifications.length - 3} more notifications
                </div>
              )}
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={() => setNotifications([])}
              className="text-royalPurple-accentTx hover:text-royalPurple-accentTx"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )

  const renderTabNavigation = () => (
    <div className="bg-royalPurple-card rounded-lg shadow-md mb-6">
      <div className="border-b border-royalPurple-border">
        <nav className="-mb-px flex space-x-8 px-6">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'library', name: 'Digital Library', icon: '📚' },
            { id: 'study', name: 'Study Tracker', icon: '⏱️' },
            { id: 'notebook', name: 'Notebooks', icon: '📓' },
            { id: 'calculator', name: 'Calculators', icon: '🧮' },
            { id: 'groups', name: 'Study Groups', icon: '👥' },
            { id: 'goals', name: 'Goals', icon: '🎯' },
            { id: 'projects', name: 'Projects', icon: '🔬' },
            { id: 'learning', name: 'Learning Style', icon: '🧠' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-royalPurple-border2 text-royalPurple-accentTx'
                  : 'border-transparent text-royalPurple-text3 hover:text-royalPurple-text2 hover:border-royalPurple-border'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royalPurple-border2 mx-auto mb-4"></div>
          <p className="text-royalPurple-text2">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-royalPurple-text1">
          Welcome back, {studentData?.name || 'Student'}! 🎓
        </h1>
        <p className="text-royalPurple-text2 mt-2">
          Your enhanced learning dashboard with all the tools you need to succeed.
        </p>
      </div>

      {/* Notifications */}
      {renderNotifications()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Tab Navigation */}
      {renderTabNavigation()}

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'library' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">📚 Digital Library</h2>
            <p className="text-royalPurple-text2">
              Access thousands of educational books and resources offline.
            </p>
            {/* Digital Library component would be rendered here */}
          </div>
        )}
        {activeTab === 'study' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">⏱️ Study Time Tracker</h2>
            <p className="text-royalPurple-text2">
              Track your study sessions and analyze your productivity.
            </p>
            {/* Study Time Tracker component would be rendered here */}
          </div>
        )}
        {activeTab === 'notebook' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">📓 Digital Notebooks</h2>
            <p className="text-royalPurple-text2">
              Organize your notes across all subjects with powerful search and tagging.
            </p>
            {/* Digital Notebook component would be rendered here */}
          </div>
        )}
        {activeTab === 'calculator' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">🧮 Subject Calculators</h2>
            <p className="text-royalPurple-text2">
              Access specialized calculators for mathematics, science, and agriculture.
            </p>
            {/* Calculator System component would be rendered here */}
          </div>
        )}
        {activeTab === 'groups' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">👥 Peer Study Groups</h2>
            <p className="text-royalPurple-text2">
              Join or create study groups with your classmates for collaborative learning.
            </p>
            {/* Study Groups component would be rendered here */}
          </div>
        )}
        {activeTab === 'goals' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">🎯 Academic Goals</h2>
            <p className="text-royalPurple-text2">
              Set and track your academic goals with detailed progress monitoring.
            </p>
            {/* Goals System component would be rendered here */}
          </div>
        )}
        {activeTab === 'projects' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">🔬 Research Projects</h2>
            <p className="text-royalPurple-text2">
              Manage your research projects with stage-by-stage tracking and resource organization.
            </p>
            {/* Project Manager component would be rendered here */}
          </div>
        )}
        {activeTab === 'learning' && (
          <div className="bg-royalPurple-card rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">🧠 Learning Style Assessment</h2>
            <p className="text-royalPurple-text2">
              Discover your learning style and get personalized study recommendations.
            </p>
            {/* Learning Style Assessment component would be rendered here */}
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedStudentDashboard
