/**
 * Wellbeing Monitoring System
 * Comprehensive mental health and wellness tracking with privacy-first approach
 */

export class WellbeingMonitoringSystem {
  static WELLBEING_INDICATORS = {
    ACADEMIC_STRESS: {
      name: 'Academic Stress',
      factors: ['assignment_load', 'exam_pressure', 'grade_anxiety', 'time_management'],
      thresholds: { low: 30, moderate: 60, high: 80 },
      interventions: ['study_planning', 'stress_management', 'academic_support']
    },
    SOCIAL_ENGAGEMENT: {
      name: 'Social Engagement',
      factors: ['peer_interaction', 'group_participation', 'communication_frequency', 'isolation_indicators'],
      thresholds: { low: 40, moderate: 70, high: 90 },
      interventions: ['social_activities', 'peer_support', 'counseling']
    },
    EMOTIONAL_WELLBEING: {
      name: 'Emotional Wellbeing',
      factors: ['mood_patterns', 'anxiety_levels', 'motivation', 'self_esteem'],
      thresholds: { low: 35, moderate: 65, high: 85 },
      interventions: ['counseling', 'mindfulness', 'emotional_support']
    },
    PHYSICAL_HEALTH: {
      name: 'Physical Health',
      factors: ['sleep_patterns', 'energy_levels', 'physical_activity', 'health_complaints'],
      thresholds: { low: 40, moderate: 70, high: 90 },
      interventions: ['health_education', 'physical_activity', 'medical_referral']
    },
    BEHAVIORAL_PATTERNS: {
      name: 'Behavioral Patterns',
      factors: ['attendance', 'punctuality', 'participation', 'behavioral_changes'],
      thresholds: { low: 50, moderate: 75, high: 90 },
      interventions: ['behavioral_support', 'routine_establishment', 'counseling']
    }
  }

  static INTERVENTION_STRATEGIES = {
    IMMEDIATE: {
      timeframe: '24_hours',
      actions: ['crisis_support', 'emergency_contact', 'safety_planning', 'immediate_counseling'],
      triggers: ['crisis_indicators', 'self_harm_risk', 'severe_distress']
    },
    SHORT_TERM: {
      timeframe: '1_week',
      actions: ['counseling_session', 'peer_support', 'academic_adjustment', 'family_contact'],
      triggers: ['declining_wellbeing', 'stress_overload', 'social_isolation']
    },
    MEDIUM_TERM: {
      timeframe: '1_month',
      actions: ['therapy_referral', 'skill_building', 'support_group', 'lifestyle_changes'],
      triggers: ['persistent_issues', 'recurring_patterns', 'moderate_risk']
    },
    LONG_TERM: {
      timeframe: '3_months',
      actions: ['comprehensive_support', 'system_changes', 'ongoing_monitoring', 'prevention_programs'],
      triggers: ['chronic_issues', 'systemic_problems', 'prevention_focus']
    }
  }

  static PRIVACY_LEVELS = {
    ANONYMOUS: {
      level: 1,
      description: 'Completely anonymous data collection',
      access: ['system_analytics'],
      retention: '1_year'
    },
    CONFIDENTIAL: {
      level: 2,
      description: 'Confidential with counselor access only',
      access: ['assigned_counselor', 'system_admin'],
      retention: '3_years'
    },
    RESTRICTED: {
      level: 3,
      description: 'Restricted access for intervention purposes',
      access: ['counselor', 'hod', 'parent_guardian'],
      retention: '5_years'
    },
    EMERGENCY: {
      level: 4,
      description: 'Emergency access for safety purposes',
      access: ['all_staff', 'emergency_contacts', 'medical_personnel'],
      retention: 'indefinite'
    }
  }

  static createWellbeingProfile(studentData) {
    return {
      id: this.generateProfileId(),
      studentId: studentData.studentId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      privacyLevel: studentData.privacyLevel || 'CONFIDENTIAL',
      consentGiven: studentData.consentGiven || false,
      parentalConsent: studentData.parentalConsent || false,
      indicators: this.initializeIndicators(),
      riskLevel: 'LOW',
      interventions: [],
      supportTeam: [],
      emergencyContacts: studentData.emergencyContacts || [],
      preferences: {
        communicationMethod: studentData.communicationMethod || 'in_person',
        supportType: studentData.supportType || 'counseling',
        anonymousReporting: studentData.anonymousReporting || true
      },
      analytics: {
        trendsAnalysis: {},
        riskFactors: [],
        protectiveFactors: [],
        interventionEffectiveness: {}
      }
    }
  }

  static initializeIndicators() {
    const indicators = {}
    Object.keys(this.WELLBEING_INDICATORS).forEach(key => {
      indicators[key] = {
        currentScore: 50, // Neutral baseline
        trend: 'stable',
        lastAssessment: new Date(),
        history: [],
        factors: {},
        alerts: []
      }
    })
    return indicators
  }

  static assessWellbeing(profileId, assessmentData) {
    const assessment = {
      id: this.generateAssessmentId(),
      profileId: profileId,
      timestamp: new Date(),
      type: assessmentData.type || 'SELF_REPORT',
      source: assessmentData.source || 'student',
      indicators: this.processIndicatorScores(assessmentData.responses),
      overallScore: 0,
      riskLevel: 'LOW',
      recommendations: [],
      followUpRequired: false,
      confidentialityLevel: assessmentData.confidentialityLevel || 'CONFIDENTIAL'
    }

    // Calculate overall wellbeing score
    assessment.overallScore = this.calculateOverallScore(assessment.indicators)
    assessment.riskLevel = this.determineRiskLevel(assessment.overallScore, assessment.indicators)
    assessment.recommendations = this.generateRecommendations(assessment)
    assessment.followUpRequired = this.requiresFollowUp(assessment)

    return assessment
  }

  static processIndicatorScores(responses) {
    const indicators = {}
    
    Object.keys(this.WELLBEING_INDICATORS).forEach(indicatorKey => {
      const indicator = this.WELLBEING_INDICATORS[indicatorKey]
      let score = 0
      let factorCount = 0

      indicator.factors.forEach(factor => {
        if (responses[factor] !== undefined) {
          score += responses[factor]
          factorCount++
        }
      })

      indicators[indicatorKey] = {
        score: factorCount > 0 ? Math.round(score / factorCount) : 50,
        factors: indicator.factors.reduce((acc, factor) => {
          if (responses[factor] !== undefined) {
            acc[factor] = responses[factor]
          }
          return acc
        }, {}),
        trend: this.calculateTrend(indicatorKey, score / factorCount),
        alerts: this.checkAlerts(indicatorKey, score / factorCount)
      }
    })

    return indicators
  }

  static calculateOverallScore(indicators) {
    const scores = Object.values(indicators).map(indicator => indicator.score)
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }

  static determineRiskLevel(overallScore, indicators) {
    // Check for critical indicators
    const criticalIndicators = Object.entries(indicators).filter(([key, indicator]) => {
      const threshold = this.WELLBEING_INDICATORS[key].thresholds
      return indicator.score < threshold.low
    })

    if (criticalIndicators.length >= 3 || overallScore < 30) {
      return 'CRITICAL'
    } else if (criticalIndicators.length >= 2 || overallScore < 50) {
      return 'HIGH'
    } else if (criticalIndicators.length >= 1 || overallScore < 70) {
      return 'MODERATE'
    } else {
      return 'LOW'
    }
  }

  static generateRecommendations(assessment) {
    const recommendations = []
    
    Object.entries(assessment.indicators).forEach(([key, indicator]) => {
      const wellbeingIndicator = this.WELLBEING_INDICATORS[key]
      const threshold = wellbeingIndicator.thresholds
      
      if (indicator.score < threshold.low) {
        wellbeingIndicator.interventions.forEach(intervention => {
          recommendations.push({
            type: intervention,
            priority: 'HIGH',
            indicator: key,
            description: this.getInterventionDescription(intervention),
            timeframe: 'IMMEDIATE'
          })
        })
      } else if (indicator.score < threshold.moderate) {
        recommendations.push({
          type: 'monitoring',
          priority: 'MEDIUM',
          indicator: key,
          description: `Continue monitoring ${wellbeingIndicator.name.toLowerCase()}`,
          timeframe: 'SHORT_TERM'
        })
      }
    })

    return recommendations
  }

  static createInterventionPlan(assessmentId, recommendations) {
    return {
      id: this.generateInterventionId(),
      assessmentId: assessmentId,
      createdAt: new Date(),
      status: 'ACTIVE',
      priority: this.determinePlanPriority(recommendations),
      interventions: recommendations.map(rec => ({
        id: this.generateInterventionActionId(),
        type: rec.type,
        description: rec.description,
        assignedTo: this.assignIntervention(rec.type),
        dueDate: this.calculateDueDate(rec.timeframe),
        status: 'PENDING',
        resources: this.getInterventionResources(rec.type),
        progress: {
          started: false,
          completed: false,
          effectiveness: null,
          notes: []
        }
      })),
      reviewSchedule: this.createReviewSchedule(recommendations),
      emergencyProtocol: this.createEmergencyProtocol(),
      supportTeam: this.assembleSupportTeam(recommendations)
    }
  }

  static monitorProgress(profileId, timeframe = '30_days') {
    return {
      profileId: profileId,
      timeframe: timeframe,
      progressMetrics: {
        overallImprovement: this.calculateImprovement(profileId, timeframe),
        indicatorTrends: this.analyzeIndicatorTrends(profileId, timeframe),
        interventionEffectiveness: this.evaluateInterventions(profileId, timeframe),
        riskLevelChanges: this.trackRiskLevelChanges(profileId, timeframe)
      },
      insights: {
        positiveFactors: this.identifyPositiveFactors(profileId),
        concernAreas: this.identifyConcernAreas(profileId),
        recommendations: this.generateProgressRecommendations(profileId)
      },
      nextSteps: this.planNextSteps(profileId)
    }
  }

  static createWellnessAlert(alertData) {
    return {
      id: this.generateAlertId(),
      profileId: alertData.profileId,
      type: alertData.type, // 'RISK_INCREASE', 'INTERVENTION_NEEDED', 'EMERGENCY', 'IMPROVEMENT'
      severity: alertData.severity, // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      message: alertData.message,
      timestamp: new Date(),
      indicators: alertData.indicators || [],
      recommendedActions: alertData.recommendedActions || [],
      assignedTo: alertData.assignedTo || [],
      status: 'ACTIVE',
      escalationLevel: alertData.escalationLevel || 1,
      privacyLevel: alertData.privacyLevel || 'CONFIDENTIAL',
      autoGenerated: alertData.autoGenerated || true
    }
  }

  // Helper methods
  static calculateTrend(indicatorKey, currentScore) {
    // In production, this would analyze historical data
    return 'stable' // 'improving', 'declining', 'stable'
  }

  static checkAlerts(indicatorKey, score) {
    const threshold = this.WELLBEING_INDICATORS[indicatorKey].thresholds
    const alerts = []
    
    if (score < threshold.low) {
      alerts.push({
        type: 'LOW_SCORE',
        severity: 'HIGH',
        message: `${this.WELLBEING_INDICATORS[indicatorKey].name} score is below healthy threshold`
      })
    }
    
    return alerts
  }

  static getInterventionDescription(intervention) {
    const descriptions = {
      'study_planning': 'Develop personalized study schedule and time management strategies',
      'stress_management': 'Learn stress reduction techniques and coping strategies',
      'academic_support': 'Receive additional academic assistance and tutoring',
      'social_activities': 'Participate in group activities and social events',
      'peer_support': 'Connect with peer support groups and mentorship programs',
      'counseling': 'Schedule regular counseling sessions with school counselor',
      'mindfulness': 'Practice mindfulness and meditation techniques',
      'emotional_support': 'Access emotional support resources and therapy',
      'health_education': 'Learn about healthy lifestyle choices and habits',
      'physical_activity': 'Engage in regular physical exercise and sports',
      'medical_referral': 'Consult with healthcare professionals for medical evaluation',
      'behavioral_support': 'Work with behavioral specialists on positive behavior strategies',
      'routine_establishment': 'Develop consistent daily routines and habits'
    }
    return descriptions[intervention] || 'Specialized intervention support'
  }

  static requiresFollowUp(assessment) {
    return assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL' ||
           assessment.recommendations.some(rec => rec.priority === 'HIGH')
  }

  static determinePlanPriority(recommendations) {
    if (recommendations.some(rec => rec.priority === 'HIGH')) return 'HIGH'
    if (recommendations.some(rec => rec.priority === 'MEDIUM')) return 'MEDIUM'
    return 'LOW'
  }

  static assignIntervention(interventionType) {
    const assignments = {
      'counseling': 'school_counselor',
      'academic_support': 'academic_coordinator',
      'medical_referral': 'school_nurse',
      'behavioral_support': 'behavioral_specialist',
      'peer_support': 'peer_coordinator'
    }
    return assignments[interventionType] || 'wellbeing_coordinator'
  }

  static calculateDueDate(timeframe) {
    const now = new Date()
    const timeframes = {
      'IMMEDIATE': 1,
      'SHORT_TERM': 7,
      'MEDIUM_TERM': 30,
      'LONG_TERM': 90
    }
    const days = timeframes[timeframe] || 7
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  }

  static getInterventionResources(interventionType) {
    const resources = {
      'counseling': ['counseling_room', 'therapy_materials', 'assessment_tools'],
      'academic_support': ['tutoring_center', 'study_materials', 'learning_resources'],
      'stress_management': ['relaxation_room', 'mindfulness_apps', 'stress_management_guides'],
      'physical_activity': ['gym_facilities', 'sports_equipment', 'fitness_programs']
    }
    return resources[interventionType] || ['general_support_resources']
  }

  static createReviewSchedule(recommendations) {
    const highPriorityCount = recommendations.filter(rec => rec.priority === 'HIGH').length
    const reviewFrequency = highPriorityCount > 0 ? 'weekly' : 'bi_weekly'
    
    return {
      frequency: reviewFrequency,
      nextReview: this.calculateDueDate('SHORT_TERM'),
      reviewType: 'progress_assessment',
      participants: ['student', 'counselor', 'parent_guardian']
    }
  }

  static createEmergencyProtocol() {
    return {
      triggerConditions: ['self_harm_risk', 'severe_distress', 'crisis_indicators'],
      immediateActions: ['ensure_safety', 'contact_emergency_services', 'notify_parents', 'crisis_counseling'],
      emergencyContacts: ['school_counselor', 'crisis_hotline', 'emergency_services'],
      escalationProcedure: ['assess_immediate_risk', 'implement_safety_plan', 'coordinate_professional_help']
    }
  }

  static assembleSupportTeam(recommendations) {
    const team = ['school_counselor', 'wellbeing_coordinator']
    
    if (recommendations.some(rec => rec.type === 'academic_support')) {
      team.push('academic_coordinator')
    }
    if (recommendations.some(rec => rec.type === 'medical_referral')) {
      team.push('school_nurse')
    }
    if (recommendations.some(rec => rec.type === 'behavioral_support')) {
      team.push('behavioral_specialist')
    }
    
    return team
  }

  // Analytics and monitoring methods
  static calculateImprovement(profileId, timeframe) {
    // In production, this would analyze historical assessment data
    return {
      overallChange: 15, // percentage improvement
      significantChanges: ['EMOTIONAL_WELLBEING', 'ACADEMIC_STRESS'],
      trendDirection: 'improving'
    }
  }

  static analyzeIndicatorTrends(profileId, timeframe) {
    // Mock trend analysis - in production would use real historical data
    return Object.keys(this.WELLBEING_INDICATORS).reduce((trends, indicator) => {
      trends[indicator] = {
        direction: 'stable',
        changeRate: 0,
        significance: 'low'
      }
      return trends
    }, {})
  }

  static evaluateInterventions(profileId, timeframe) {
    return {
      completedInterventions: 3,
      effectiveInterventions: 2,
      ongoingInterventions: 1,
      effectivenessRate: 67,
      mostEffective: 'counseling',
      leastEffective: 'study_planning'
    }
  }

  static trackRiskLevelChanges(profileId, timeframe) {
    return {
      initialRisk: 'MODERATE',
      currentRisk: 'LOW',
      changeDirection: 'improvement',
      stabilityPeriod: '2_weeks'
    }
  }

  static identifyPositiveFactors(profileId) {
    return [
      'strong_peer_relationships',
      'family_support',
      'academic_engagement',
      'extracurricular_participation'
    ]
  }

  static identifyConcernAreas(profileId) {
    return [
      'time_management',
      'test_anxiety',
      'social_confidence'
    ]
  }

  static generateProgressRecommendations(profileId) {
    return [
      {
        type: 'continue_current_interventions',
        description: 'Maintain current counseling schedule',
        priority: 'MEDIUM'
      },
      {
        type: 'introduce_peer_support',
        description: 'Consider joining peer support group',
        priority: 'LOW'
      }
    ]
  }

  static planNextSteps(profileId) {
    return {
      immediateActions: ['schedule_follow_up_assessment'],
      shortTermGoals: ['improve_stress_management', 'enhance_social_connections'],
      longTermObjectives: ['maintain_stable_wellbeing', 'develop_resilience_skills'],
      reviewDate: this.calculateDueDate('MEDIUM_TERM')
    }
  }

  // ID generation methods
  static generateProfileId() {
    return `wellbeing_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateAssessmentId() {
    return `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateInterventionId() {
    return `intervention_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateInterventionActionId() {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
