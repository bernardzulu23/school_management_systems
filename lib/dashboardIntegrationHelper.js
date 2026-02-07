/**
 * Dashboard Integration Helper
 * Provides utilities to integrate existing dashboard components with the new phase system
 * Ensures backward compatibility while adding new phase features
 */

import { PhaseIntegrationSystem } from './phaseIntegrationSystem'
import { crossPhaseDataSync } from './crossPhaseDataSync'

export class DashboardIntegrationHelper {
  constructor() {
    this.componentRegistry = new Map()
    this.phaseWidgets = new Map()
    this.legacyComponents = new Set()
    this.migrationStrategies = new Map()
    
    this.initializePhaseWidgets()
    this.initializeMigrationStrategies()
  }

  /**
   * Initialize phase-specific widgets
   */
  initializePhaseWidgets() {
    // Phase 1: Gamification & Analytics Widgets
    this.phaseWidgets.set('PHASE_1', {
      'gamification_summary': {
        component: 'GamificationSummaryWidget',
        props: ['level', 'points', 'achievements', 'streaks'],
        size: 'medium',
        priority: 'high'
      },
      'analytics_overview': {
        component: 'AnalyticsOverviewWidget',
        props: ['performance_trends', 'risk_indicators', 'predictions'],
        size: 'large',
        priority: 'high'
      },
      'leaderboard_mini': {
        component: 'LeaderboardMiniWidget',
        props: ['user_rank', 'top_performers', 'class_average'],
        size: 'small',
        priority: 'medium'
      }
    })

    // Phase 2: AI-Powered Features Widgets
    this.phaseWidgets.set('PHASE_2', {
      'ai_recommendations': {
        component: 'AIRecommendationsWidget',
        props: ['recommendations', 'learning_style', 'confidence'],
        size: 'medium',
        priority: 'high'
      },
      'learning_path_progress': {
        component: 'LearningPathWidget',
        props: ['current_path', 'progress', 'next_milestone'],
        size: 'large',
        priority: 'medium'
      },
      'ai_tutor_status': {
        component: 'AITutorStatusWidget',
        props: ['active_sessions', 'recent_interactions', 'availability'],
        size: 'small',
        priority: 'low'
      }
    })

    // Phase 3: Communication & Collaboration Widgets
    this.phaseWidgets.set('PHASE_3', {
      'communication_hub': {
        component: 'CommunicationHubWidget',
        props: ['unread_messages', 'active_conversations', 'online_status'],
        size: 'medium',
        priority: 'high'
      },
      'collaboration_projects': {
        component: 'CollaborationProjectsWidget',
        props: ['active_projects', 'team_invitations', 'deadlines'],
        size: 'large',
        priority: 'medium'
      },
      'social_activity': {
        component: 'SocialActivityWidget',
        props: ['recent_activity', 'friend_updates', 'group_notifications'],
        size: 'small',
        priority: 'low'
      }
    })

    // Phase 4: Wellbeing & Accessibility Widgets
    this.phaseWidgets.set('PHASE_4', {
      'wellbeing_status': {
        component: 'WellbeingStatusWidget',
        props: ['wellbeing_score', 'risk_level', 'last_assessment'],
        size: 'medium',
        priority: 'high'
      },
      'accessibility_settings': {
        component: 'AccessibilitySettingsWidget',
        props: ['active_accommodations', 'quick_settings', 'assistive_tech'],
        size: 'small',
        priority: 'medium'
      },
      'support_resources': {
        component: 'SupportResourcesWidget',
        props: ['available_resources', 'scheduled_sessions', 'emergency_contacts'],
        size: 'medium',
        priority: 'medium'
      }
    })

    // Phase 5: Advanced Assessment & Innovation Widgets
    this.phaseWidgets.set('PHASE_5', {
      'portfolio_overview': {
        component: 'PortfolioOverviewWidget',
        props: ['portfolio_items', 'recent_uploads', 'peer_reviews'],
        size: 'large',
        priority: 'high'
      },
      'innovation_projects': {
        component: 'InnovationProjectsWidget',
        props: ['lab_projects', 'technology_access', 'innovation_challenges'],
        size: 'medium',
        priority: 'medium'
      },
      'emerging_tech_status': {
        component: 'EmergingTechStatusWidget',
        props: ['voice_interface', 'ar_vr_access', 'iot_connections'],
        size: 'small',
        priority: 'low'
      }
    })
  }

  /**
   * Initialize migration strategies for legacy components
   */
  initializeMigrationStrategies() {
    // Strategy for existing student dashboard
    this.migrationStrategies.set('StudentDashboard', {
      phaseMapping: {
        'grades': 'PHASE_1:analytics_overview',
        'assignments': 'PHASE_1:gamification_summary',
        'timetable': 'legacy:timetable_summary',
        'notifications': 'PHASE_3:communication_hub'
      },
      newWidgets: ['PHASE_4:wellbeing_status', 'PHASE_2:ai_recommendations'],
      layoutAdjustments: {
        gridColumns: 3,
        responsiveBreakpoints: ['768px', '1024px', '1440px']
      }
    })

    // Strategy for existing teacher dashboard
    this.migrationStrategies.set('TeacherDashboard', {
      phaseMapping: {
        'class_overview': 'PHASE_1:analytics_overview',
        'student_performance': 'PHASE_1:analytics_overview',
        'assignments': 'PHASE_5:portfolio_overview',
        'communication': 'PHASE_3:communication_hub'
      },
      newWidgets: ['PHASE_4:wellbeing_status', 'PHASE_2:learning_path_progress'],
      layoutAdjustments: {
        gridColumns: 4,
        responsiveBreakpoints: ['768px', '1024px', '1440px']
      }
    })

    // Strategy for existing HOD dashboard
    this.migrationStrategies.set('HodDashboard', {
      phaseMapping: {
        'department_overview': 'PHASE_1:analytics_overview',
        'teacher_performance': 'PHASE_1:analytics_overview',
        'resource_management': 'PHASE_5:innovation_projects'
      },
      newWidgets: ['PHASE_3:collaboration_projects', 'PHASE_4:support_resources'],
      layoutAdjustments: {
        gridColumns: 4,
        responsiveBreakpoints: ['768px', '1024px', '1440px']
      }
    })

    // Strategy for existing headteacher dashboard
    this.migrationStrategies.set('HeadteacherDashboard', {
      phaseMapping: {
        'school_overview': 'PHASE_1:analytics_overview',
        'performance_analytics': 'PHASE_1:analytics_overview',
        'system_management': 'legacy:system_management'
      },
      newWidgets: ['PHASE_4:wellbeing_status', 'PHASE_5:innovation_projects'],
      layoutAdjustments: {
        gridColumns: 5,
        responsiveBreakpoints: ['768px', '1024px', '1440px', '1920px']
      }
    })
  }

  /**
   * Register a legacy component for integration
   */
  registerLegacyComponent(componentName, componentConfig) {
    this.legacyComponents.add(componentName)
    this.componentRegistry.set(componentName, {
      ...componentConfig,
      isLegacy: true,
      registeredAt: new Date()
    })
  }

  /**
   * Get integration strategy for a component
   */
  getIntegrationStrategy(componentName, userRole) {
    const strategy = this.migrationStrategies.get(componentName)
    if (!strategy) return null

    // Filter widgets based on user role permissions
    const availableFeatures = PhaseIntegrationSystem.getAvailableFeatures(userRole)
    const filteredWidgets = strategy.newWidgets.filter(widget => {
      const [phase] = widget.split(':')
      return availableFeatures.some(feature => 
        PhaseIntegrationSystem.ROLE_PERMISSIONS[userRole].phases.includes(phase)
      )
    })

    return {
      ...strategy,
      newWidgets: filteredWidgets,
      availableFeatures
    }
  }

  /**
   * Generate widget configuration for a dashboard
   */
  generateWidgetConfig(componentName, userRole, customizations = {}) {
    const strategy = this.getIntegrationStrategy(componentName, userRole)
    if (!strategy) return []

    const widgets = []

    // Add legacy widgets (mapped to new system)
    Object.entries(strategy.phaseMapping).forEach(([legacyWidget, newWidget]) => {
      if (newWidget.startsWith('legacy:')) {
        // Keep legacy widget as-is
        widgets.push({
          id: legacyWidget,
          type: 'legacy',
          component: legacyWidget,
          size: 'medium',
          priority: 'medium',
          position: widgets.length
        })
      } else {
        // Map to new phase widget
        const [phase, widgetType] = newWidget.split(':')
        const phaseWidgets = this.phaseWidgets.get(phase)
        const widgetConfig = phaseWidgets?.[widgetType]

        if (widgetConfig) {
          widgets.push({
            id: `${phase}_${widgetType}`,
            type: 'phase',
            phase,
            component: widgetConfig.component,
            props: widgetConfig.props,
            size: widgetConfig.size,
            priority: widgetConfig.priority,
            position: widgets.length
          })
        }
      }
    })

    // Add new phase widgets
    strategy.newWidgets.forEach(widgetSpec => {
      const [phase, widgetType] = widgetSpec.split(':')
      const phaseWidgets = this.phaseWidgets.get(phase)
      const widgetConfig = phaseWidgets?.[widgetType]

      if (widgetConfig) {
        widgets.push({
          id: `${phase}_${widgetType}`,
          type: 'phase',
          phase,
          component: widgetConfig.component,
          props: widgetConfig.props,
          size: widgetConfig.size,
          priority: widgetConfig.priority,
          position: widgets.length
        })
      }
    })

    // Apply customizations
    if (customizations.hiddenWidgets) {
      return widgets.filter(widget => !customizations.hiddenWidgets.includes(widget.id))
    }

    // Sort by priority and position
    return widgets.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const aPriority = priorityOrder[a.priority] || 1
      const bPriority = priorityOrder[b.priority] || 1
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      return a.position - b.position
    })
  }

  /**
   * Create integration wrapper for legacy component
   */
  createIntegrationWrapper(LegacyComponent, componentName) {
    return function IntegratedComponent(props) {
      const { userRole, userId, ...otherProps } = props
      const [phaseData, setPhaseData] = React.useState({})
      const [widgetConfig, setWidgetConfig] = React.useState([])

      React.useEffect(() => {
        // Load phase data
        loadPhaseDataForComponent(userId, userRole, componentName)
          .then(setPhaseData)

        // Generate widget configuration
        const config = this.generateWidgetConfig(componentName, userRole)
        setWidgetConfig(config)

        // Setup sync listeners
        const syncListeners = []
        config.forEach(widget => {
          if (widget.type === 'phase') {
            const listener = (syncItem) => {
              if (syncItem.userId === userId && syncItem.phase === widget.phase) {
                // Refresh phase data when sync occurs
                loadPhaseDataForComponent(userId, userRole, componentName)
                  .then(setPhaseData)
              }
            }
            
            crossPhaseDataSync.addSyncListener(widget.phase, '*', listener)
            syncListeners.push({ phase: widget.phase, listener })
          }
        })

        // Cleanup listeners on unmount
        return () => {
          syncListeners.forEach(({ phase, listener }) => {
            crossPhaseDataSync.removeSyncListener(phase, '*', listener)
          })
        }
      }, [userId, userRole])

      return React.createElement(LegacyComponent, {
        ...otherProps,
        userRole,
        userId,
        phaseData,
        widgetConfig,
        isIntegrated: true
      })
    }.bind(this)
  }

  /**
   * Get available widgets for a user role
   */
  getAvailableWidgets(userRole) {
    const availableFeatures = PhaseIntegrationSystem.getAvailableFeatures(userRole)
    const widgets = []

    this.phaseWidgets.forEach((phaseWidgets, phase) => {
      if (PhaseIntegrationSystem.ROLE_PERMISSIONS[userRole].phases.includes(phase)) {
        Object.entries(phaseWidgets).forEach(([widgetType, config]) => {
          widgets.push({
            id: `${phase}_${widgetType}`,
            phase,
            type: widgetType,
            name: this.formatWidgetName(widgetType),
            description: this.getWidgetDescription(phase, widgetType),
            ...config
          })
        })
      }
    })

    return widgets
  }

  /**
   * Format widget name for display
   */
  formatWidgetName(widgetType) {
    return widgetType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Get widget description
   */
  getWidgetDescription(phase, widgetType) {
    const descriptions = {
      'PHASE_1': {
        'gamification_summary': 'Shows your current level, points, and achievements',
        'analytics_overview': 'Displays performance trends and predictions',
        'leaderboard_mini': 'Your ranking compared to classmates'
      },
      'PHASE_2': {
        'ai_recommendations': 'Personalized learning suggestions from AI',
        'learning_path_progress': 'Your progress on personalized learning paths',
        'ai_tutor_status': 'AI tutor availability and recent interactions'
      },
      'PHASE_3': {
        'communication_hub': 'Messages, notifications, and online status',
        'collaboration_projects': 'Active team projects and deadlines',
        'social_activity': 'Recent activity from friends and groups'
      },
      'PHASE_4': {
        'wellbeing_status': 'Your mental health and wellbeing indicators',
        'accessibility_settings': 'Quick access to accessibility features',
        'support_resources': 'Available support and counseling resources'
      },
      'PHASE_5': {
        'portfolio_overview': 'Your digital portfolio and recent work',
        'innovation_projects': 'Innovation lab projects and challenges',
        'emerging_tech_status': 'Access to voice, AR/VR, and IoT features'
      }
    }

    return descriptions[phase]?.[widgetType] || 'Phase-specific dashboard widget'
  }

  /**
   * Validate widget configuration
   */
  validateWidgetConfig(config) {
    const errors = []

    config.forEach((widget, index) => {
      if (!widget.id) {
        errors.push(`Widget at index ${index} missing required 'id' field`)
      }

      if (!widget.component) {
        errors.push(`Widget ${widget.id} missing required 'component' field`)
      }

      if (widget.type === 'phase' && !widget.phase) {
        errors.push(`Phase widget ${widget.id} missing required 'phase' field`)
      }

      if (!['small', 'medium', 'large'].includes(widget.size)) {
        errors.push(`Widget ${widget.id} has invalid size: ${widget.size}`)
      }
    })

    return errors
  }

  /**
   * Get integration statistics
   */
  getIntegrationStats() {
    return {
      totalPhaseWidgets: Array.from(this.phaseWidgets.values())
        .reduce((sum, widgets) => sum + Object.keys(widgets).length, 0),
      totalLegacyComponents: this.legacyComponents.size,
      totalMigrationStrategies: this.migrationStrategies.size,
      registeredComponents: this.componentRegistry.size
    }
  }
}

/**
 * Load phase data for a specific component
 */
async function loadPhaseDataForComponent(userId, userRole, componentName) {
  // Simulate loading phase-specific data
  const phaseData = {}
  
  const availablePhases = PhaseIntegrationSystem.ROLE_PERMISSIONS[userRole].phases
  
  for (const phase of availablePhases) {
    // Simulate API call to get phase data
    phaseData[phase] = await new Promise(resolve => {
      setTimeout(() => {
        resolve({
          lastUpdated: new Date(),
          data: { /* phase-specific data */ }
        })
      }, 100)
    })
  }
  
  return phaseData
}

// Export singleton instance
export const dashboardIntegrationHelper = new DashboardIntegrationHelper()
