/**
 * AI-Powered Analytics Engine
 * Advanced predictive analytics and intelligent insights for education
 */

export class PredictiveAnalyticsEngine {
  static PREDICTION_MODELS = {
    ACADEMIC_PERFORMANCE: 'academic_performance',
    ATTENDANCE_RISK: 'attendance_risk',
    ENGAGEMENT_LEVEL: 'engagement_level',
    LEARNING_STYLE: 'learning_style',
    INTERVENTION_TIMING: 'intervention_timing',
    CAREER_PATHWAY: 'career_pathway'
  }

  static RISK_LEVELS = {
    LOW: { level: 'low', color: '#10B981', threshold: 0.3 },
    MEDIUM: { level: 'medium', color: '#F59E0B', threshold: 0.6 },
    HIGH: { level: 'high', color: '#EF4444', threshold: 1.0 }
  }

  static predictAcademicPerformance(studentData, timeframe = 6) {
    const features = this.extractAcademicFeatures(studentData)
    const prediction = this.runPredictionModel(features, 'ACADEMIC_PERFORMANCE')
    
    return {
      studentId: studentData.id,
      prediction: {
        expectedGPA: prediction.gpa,
        confidence: prediction.confidence,
        timeframe: `${timeframe} months`,
        riskLevel: this.calculateRiskLevel(prediction.gpa),
        factors: this.identifyInfluencingFactors(features, prediction)
      },
      recommendations: this.generateAcademicRecommendations(prediction, features),
      interventions: this.suggestInterventions(prediction, studentData),
      generatedAt: new Date()
    }
  }

  static extractAcademicFeatures(studentData) {
    return {
      currentGPA: this.calculateCurrentGPA(studentData.grades || []),
      attendanceRate: this.calculateAttendanceRate(studentData.attendance || []),
      assignmentCompletionRate: this.calculateCompletionRate(studentData.assignments || []),
      engagementScore: this.calculateEngagementScore(studentData.activities || []),
      studyHabits: this.analyzeStudyHabits(studentData.studyLogs || []),
      socialFactors: this.analyzeSocialFactors(studentData.socialData || {}),
      historicalTrends: this.analyzeHistoricalTrends(studentData.historicalData || []),
      subjectPerformance: this.analyzeSubjectPerformance(studentData.grades || [])
    }
  }

  static runPredictionModel(features, modelType) {
    // Simplified ML model simulation - in production would use actual ML models
    switch (modelType) {
      case 'ACADEMIC_PERFORMANCE':
        return this.academicPerformanceModel(features)
      case 'ATTENDANCE_RISK':
        return this.attendanceRiskModel(features)
      case 'ENGAGEMENT_LEVEL':
        return this.engagementLevelModel(features)
      default:
        throw new Error(`Unknown model type: ${modelType}`)
    }
  }

  static academicPerformanceModel(features) {
    // Weighted algorithm simulating ML prediction
    const weights = {
      currentGPA: 0.35,
      attendanceRate: 0.25,
      assignmentCompletionRate: 0.20,
      engagementScore: 0.15,
      studyHabits: 0.05
    }

    let predictedGPA = 0
    let confidence = 0

    Object.keys(weights).forEach(feature => {
      if (features[feature] !== undefined) {
        predictedGPA += features[feature] * weights[feature]
        confidence += weights[feature]
      }
    })

    // Apply trend adjustments
    const trendAdjustment = this.calculateTrendAdjustment(features.historicalTrends)
    predictedGPA += trendAdjustment

    return {
      gpa: Math.max(0, Math.min(4.0, predictedGPA)),
      confidence: Math.min(1.0, confidence),
      trendAdjustment
    }
  }

  static generateAcademicRecommendations(prediction, features) {
    const recommendations = []

    if (prediction.gpa < 2.5) {
      recommendations.push({
        type: 'URGENT',
        title: 'Academic Support Needed',
        description: 'Consider additional tutoring and study support',
        priority: 'HIGH',
        actions: ['Schedule tutor sessions', 'Create study plan', 'Meet with counselor']
      })
    }

    if (features.attendanceRate < 0.8) {
      recommendations.push({
        type: 'ATTENDANCE',
        title: 'Improve Attendance',
        description: 'Regular attendance is crucial for academic success',
        priority: 'MEDIUM',
        actions: ['Track attendance patterns', 'Address barriers', 'Set attendance goals']
      })
    }

    if (features.assignmentCompletionRate < 0.7) {
      recommendations.push({
        type: 'ORGANIZATION',
        title: 'Assignment Management',
        description: 'Develop better assignment tracking and completion habits',
        priority: 'MEDIUM',
        actions: ['Use assignment planner', 'Set reminders', 'Break down large tasks']
      })
    }

    return recommendations
  }

  static calculateCurrentGPA(grades) {
    if (grades.length === 0) return 0
    const total = grades.reduce((sum, grade) => sum + this.convertToGPA(grade.score), 0)
    return total / grades.length
  }

  static convertToGPA(percentage) {
    if (percentage >= 97) return 4.0
    if (percentage >= 93) return 3.7
    if (percentage >= 90) return 3.3
    if (percentage >= 87) return 3.0
    if (percentage >= 83) return 2.7
    if (percentage >= 80) return 2.3
    if (percentage >= 77) return 2.0
    if (percentage >= 73) return 1.7
    if (percentage >= 70) return 1.3
    if (percentage >= 67) return 1.0
    return 0.0
  }

  static calculateAttendanceRate(attendance) {
    if (attendance.length === 0) return 1.0
    const present = attendance.filter(record => record.status === 'present').length
    return present / attendance.length
  }

  static calculateCompletionRate(assignments) {
    if (assignments.length === 0) return 1.0
    const completed = assignments.filter(assignment => assignment.status === 'completed').length
    return completed / assignments.length
  }

  static calculateEngagementScore(activities) {
    // Composite score based on various engagement metrics
    let score = 0
    const metrics = {
      classParticipation: 0.3,
      onlineActivity: 0.2,
      extracurriculars: 0.2,
      peerInteraction: 0.15,
      resourceUsage: 0.15
    }

    Object.keys(metrics).forEach(metric => {
      const value = activities[metric] || 0
      score += (value / 100) * metrics[metric] // Normalize to 0-1 scale
    })

    return Math.min(1.0, score)
  }

  static analyzeStudyHabits(studyLogs) {
    if (studyLogs.length === 0) return 0.5

    const habits = {
      consistency: this.calculateStudyConsistency(studyLogs),
      duration: this.calculateAverageStudyDuration(studyLogs),
      effectiveness: this.calculateStudyEffectiveness(studyLogs)
    }

    return (habits.consistency + habits.duration + habits.effectiveness) / 3
  }

  static calculateStudyConsistency(studyLogs) {
    // Calculate how consistently the student studies
    const daysWithStudy = new Set(studyLogs.map(log => 
      new Date(log.date).toDateString()
    )).size
    const totalDays = 30 // Last 30 days
    return Math.min(1.0, daysWithStudy / (totalDays * 0.7)) // Expect study 70% of days
  }

  static calculateAverageStudyDuration(studyLogs) {
    if (studyLogs.length === 0) return 0
    const totalMinutes = studyLogs.reduce((sum, log) => sum + log.duration, 0)
    const averageMinutes = totalMinutes / studyLogs.length
    return Math.min(1.0, averageMinutes / 120) // Normalize to 2 hours max
  }

  static calculateStudyEffectiveness(studyLogs) {
    // Based on study techniques used and outcomes
    const effectiveTechniques = ['active_recall', 'spaced_repetition', 'practice_testing']
    let effectivenessScore = 0

    studyLogs.forEach(log => {
      const techniques = log.techniques || []
      const effectiveCount = techniques.filter(t => effectiveTechniques.includes(t)).length
      effectivenessScore += effectiveCount / effectiveTechniques.length
    })

    return studyLogs.length > 0 ? effectivenessScore / studyLogs.length : 0.5
  }

  static analyzeSocialFactors(socialData) {
    return {
      peerSupport: socialData.peerSupportLevel || 0.5,
      familySupport: socialData.familySupportLevel || 0.5,
      teacherRelationship: socialData.teacherRelationshipQuality || 0.5,
      schoolConnectedness: socialData.schoolConnectednessScore || 0.5
    }
  }

  static analyzeHistoricalTrends(historicalData) {
    if (historicalData.length < 2) return { trend: 'stable', slope: 0 }

    const grades = historicalData.map(data => data.averageGrade)
    const slope = this.calculateLinearTrend(grades)

    return {
      trend: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
      slope,
      volatility: this.calculateVolatility(grades)
    }
  }

  static calculateLinearTrend(values) {
    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  }

  static calculateVolatility(values) {
    if (values.length < 2) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  static analyzeSubjectPerformance(grades) {
    const subjectPerformance = {}
    
    grades.forEach(grade => {
      if (!subjectPerformance[grade.subject]) {
        subjectPerformance[grade.subject] = []
      }
      subjectPerformance[grade.subject].push(grade.score)
    })

    Object.keys(subjectPerformance).forEach(subject => {
      const scores = subjectPerformance[subject]
      subjectPerformance[subject] = {
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        trend: this.calculateLinearTrend(scores),
        consistency: 1 - this.calculateVolatility(scores) / 100
      }
    })

    return subjectPerformance
  }

  static calculateTrendAdjustment(trends) {
    if (trends.trend === 'improving') return 0.2
    if (trends.trend === 'declining') return -0.2
    return 0
  }

  static calculateRiskLevel(gpa) {
    if (gpa >= 3.0) return this.RISK_LEVELS.LOW
    if (gpa >= 2.0) return this.RISK_LEVELS.MEDIUM
    return this.RISK_LEVELS.HIGH
  }

  static identifyInfluencingFactors(features, prediction) {
    const factors = []

    if (features.attendanceRate < 0.8) {
      factors.push({
        factor: 'Attendance',
        impact: 'negative',
        strength: 'high',
        description: 'Low attendance significantly impacts academic performance'
      })
    }

    if (features.assignmentCompletionRate < 0.7) {
      factors.push({
        factor: 'Assignment Completion',
        impact: 'negative',
        strength: 'medium',
        description: 'Incomplete assignments affect overall grades'
      })
    }

    if (features.engagementScore > 0.8) {
      factors.push({
        factor: 'High Engagement',
        impact: 'positive',
        strength: 'high',
        description: 'Strong engagement supports academic success'
      })
    }

    return factors
  }

  static suggestInterventions(prediction, studentData) {
    const interventions = []

    if (prediction.gpa < 2.5) {
      interventions.push({
        type: 'ACADEMIC_SUPPORT',
        urgency: 'HIGH',
        title: 'Intensive Academic Support',
        description: 'Immediate intervention needed to prevent academic failure',
        actions: [
          'Schedule weekly tutoring sessions',
          'Create personalized study plan',
          'Monitor progress daily',
          'Involve parents/guardians'
        ],
        timeline: 'Immediate - 2 weeks',
        expectedOutcome: 'Stabilize grades and build confidence'
      })
    }

    if (prediction.confidence < 0.6) {
      interventions.push({
        type: 'DATA_COLLECTION',
        urgency: 'MEDIUM',
        title: 'Enhanced Monitoring',
        description: 'Collect more data to improve prediction accuracy',
        actions: [
          'Implement daily check-ins',
          'Track study habits more closely',
          'Monitor engagement metrics',
          'Regular teacher feedback'
        ],
        timeline: '2-4 weeks',
        expectedOutcome: 'Better understanding of student needs'
      })
    }

    return interventions
  }
}
