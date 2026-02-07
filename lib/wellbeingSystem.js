/**
 * Mental Health & Wellbeing Monitoring System
 * Comprehensive student wellness tracking and support
 */

export class WellbeingMonitoringSystem {
  static WELLBEING_DIMENSIONS = {
    EMOTIONAL: 'emotional',
    SOCIAL: 'social',
    PHYSICAL: 'physical',
    ACADEMIC: 'academic',
    SPIRITUAL: 'spiritual'
  }

  static MOOD_SCALE = {
    EXCELLENT: { value: 5, label: 'Excellent', color: '#10B981', emoji: '😊' },
    GOOD: { value: 4, label: 'Good', color: '#84CC16', emoji: '🙂' },
    NEUTRAL: { value: 3, label: 'Neutral', color: '#F59E0B', emoji: '😐' },
    POOR: { value: 2, label: 'Poor', color: '#F97316', emoji: '😟' },
    VERY_POOR: { value: 1, label: 'Very Poor', color: '#EF4444', emoji: '😢' }
  }

  static STRESS_INDICATORS = {
    ACADEMIC_PRESSURE: {
      name: 'Academic Pressure',
      questions: [
        'I feel overwhelmed by schoolwork',
        'I worry about my grades constantly',
        'I have trouble sleeping due to academic stress'
      ],
      weight: 0.3
    },
    SOCIAL_ANXIETY: {
      name: 'Social Anxiety',
      questions: [
        'I feel anxious in social situations',
        'I worry about what others think of me',
        'I avoid group activities'
      ],
      weight: 0.25
    },
    TIME_MANAGEMENT: {
      name: 'Time Management',
      questions: [
        'I struggle to manage my time effectively',
        'I often feel rushed or behind schedule',
        'I have difficulty balancing school and personal life'
      ],
      weight: 0.2
    },
    FAMILY_RELATIONSHIPS: {
      name: 'Family Relationships',
      questions: [
        'I have conflicts with family members',
        'I feel unsupported at home',
        'Family expectations cause me stress'
      ],
      weight: 0.15
    },
    FUTURE_CONCERNS: {
      name: 'Future Concerns',
      questions: [
        'I worry about my future career',
        'I feel uncertain about my life direction',
        'I stress about college/university decisions'
      ],
      weight: 0.1
    }
  }

  static createWellbeingAssessment(studentId, assessmentType = 'COMPREHENSIVE') {
    const assessment = {
      id: this.generateAssessmentId(),
      studentId,
      type: assessmentType,
      createdAt: new Date(),
      status: 'PENDING',
      questions: this.generateQuestions(assessmentType),
      responses: {},
      results: null,
      followUpRequired: false,
      counselorNotified: false
    }

    return assessment
  }

  static generateQuestions(assessmentType) {
    const questions = []

    // Daily mood check-in
    questions.push({
      id: 'daily_mood',
      type: 'mood_scale',
      question: 'How are you feeling today overall?',
      required: true,
      category: 'EMOTIONAL'
    })

    // Stress level assessment
    questions.push({
      id: 'stress_level',
      type: 'scale',
      question: 'On a scale of 1-10, how stressed do you feel right now?',
      scale: { min: 1, max: 10 },
      required: true,
      category: 'EMOTIONAL'
    })

    // Sleep quality
    questions.push({
      id: 'sleep_quality',
      type: 'multiple_choice',
      question: 'How would you describe your sleep quality last night?',
      options: ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'],
      required: true,
      category: 'PHYSICAL'
    })

    // Social connections
    questions.push({
      id: 'social_connection',
      type: 'scale',
      question: 'How connected do you feel to your friends and classmates?',
      scale: { min: 1, max: 5 },
      required: true,
      category: 'SOCIAL'
    })

    // Academic confidence
    questions.push({
      id: 'academic_confidence',
      type: 'scale',
      question: 'How confident do you feel about your academic performance?',
      scale: { min: 1, max: 5 },
      required: true,
      category: 'ACADEMIC'
    })

    if (assessmentType === 'COMPREHENSIVE') {
      // Add detailed stress indicators
      Object.keys(this.STRESS_INDICATORS).forEach(indicator => {
        this.STRESS_INDICATORS[indicator].questions.forEach((question, index) => {
          questions.push({
            id: `${indicator.toLowerCase()}_${index}`,
            type: 'likert',
            question: question,
            scale: { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
            category: 'STRESS_INDICATOR',
            indicator: indicator
          })
        })
      })

      // Additional comprehensive questions
      questions.push(
        {
          id: 'support_system',
          type: 'multiple_select',
          question: 'Who do you feel comfortable talking to when you\'re struggling?',
          options: ['Parents/Guardians', 'Friends', 'Teachers', 'School Counselor', 'Siblings', 'Other Family', 'No one'],
          category: 'SOCIAL'
        },
        {
          id: 'coping_strategies',
          type: 'multiple_select',
          question: 'What helps you cope with stress? (Select all that apply)',
          options: ['Exercise', 'Music', 'Art', 'Talking to friends', 'Meditation', 'Gaming', 'Reading', 'Sleeping', 'Other'],
          category: 'EMOTIONAL'
        },
        {
          id: 'warning_signs',
          type: 'multiple_select',
          question: 'Have you experienced any of these recently?',
          options: ['Difficulty concentrating', 'Changes in appetite', 'Feeling hopeless', 'Irritability', 'Withdrawal from activities', 'Physical symptoms (headaches, stomach aches)'],
          category: 'EMOTIONAL',
          flagForReview: true
        }
      )
    }

    return questions
  }

  static processAssessmentResults(assessment, responses) {
    const results = {
      overallScore: 0,
      dimensionScores: {},
      riskLevel: 'LOW',
      alerts: [],
      recommendations: [],
      trends: {},
      followUpActions: []
    }

    // Calculate dimension scores
    Object.values(this.WELLBEING_DIMENSIONS).forEach(dimension => {
      results.dimensionScores[dimension] = this.calculateDimensionScore(responses, dimension)
    })

    // Calculate overall wellbeing score
    results.overallScore = this.calculateOverallScore(results.dimensionScores)

    // Determine risk level
    results.riskLevel = this.determineRiskLevel(results.overallScore, responses)

    // Generate alerts for concerning responses
    results.alerts = this.generateAlerts(responses, results.riskLevel)

    // Create personalized recommendations
    results.recommendations = this.generateRecommendations(results.dimensionScores, responses)

    // Determine follow-up actions
    results.followUpActions = this.determineFollowUpActions(results.riskLevel, results.alerts)

    return results
  }

  static calculateDimensionScore(responses, dimension) {
    const dimensionQuestions = Object.keys(responses).filter(questionId => {
      // This would map questions to dimensions based on question metadata
      return this.getQuestionDimension(questionId) === dimension
    })

    if (dimensionQuestions.length === 0) return 3 // Neutral default

    const totalScore = dimensionQuestions.reduce((sum, questionId) => {
      return sum + this.normalizeResponse(responses[questionId])
    }, 0)

    return totalScore / dimensionQuestions.length
  }

  static calculateOverallScore(dimensionScores) {
    const weights = {
      emotional: 0.3,
      social: 0.2,
      physical: 0.2,
      academic: 0.2,
      spiritual: 0.1
    }

    let weightedSum = 0
    let totalWeight = 0

    Object.keys(dimensionScores).forEach(dimension => {
      if (weights[dimension] && dimensionScores[dimension] !== undefined) {
        weightedSum += dimensionScores[dimension] * weights[dimension]
        totalWeight += weights[dimension]
      }
    })

    return totalWeight > 0 ? weightedSum / totalWeight : 3
  }

  static determineRiskLevel(overallScore, responses) {
    // Check for immediate risk indicators
    const warningSignsResponse = responses['warning_signs']
    if (warningSignsResponse && Array.isArray(warningSignsResponse)) {
      const highRiskSigns = ['Feeling hopeless', 'Withdrawal from activities']
      const hasHighRiskSigns = warningSignsResponse.some(sign => highRiskSigns.includes(sign))
      if (hasHighRiskSigns) return 'HIGH'
    }

    // Check stress level
    const stressLevel = responses['stress_level']
    if (stressLevel >= 8) return 'HIGH'
    if (stressLevel >= 6) return 'MEDIUM'

    // Check overall score
    if (overallScore <= 2) return 'HIGH'
    if (overallScore <= 3) return 'MEDIUM'
    return 'LOW'
  }

  static generateAlerts(responses, riskLevel) {
    const alerts = []

    if (riskLevel === 'HIGH') {
      alerts.push({
        type: 'URGENT',
        title: 'Immediate Support Needed',
        description: 'Student showing signs of significant distress',
        action: 'NOTIFY_COUNSELOR',
        priority: 'CRITICAL'
      })
    }

    // Check for specific concerning responses
    const stressLevel = responses['stress_level']
    if (stressLevel >= 8) {
      alerts.push({
        type: 'STRESS',
        title: 'High Stress Level Detected',
        description: `Student reported stress level of ${stressLevel}/10`,
        action: 'STRESS_MANAGEMENT_RESOURCES',
        priority: 'HIGH'
      })
    }

    const sleepQuality = responses['sleep_quality']
    if (sleepQuality === 'Poor' || sleepQuality === 'Very Poor') {
      alerts.push({
        type: 'SLEEP',
        title: 'Poor Sleep Quality',
        description: 'Sleep issues may be affecting wellbeing',
        action: 'SLEEP_HYGIENE_GUIDANCE',
        priority: 'MEDIUM'
      })
    }

    return alerts
  }

  static generateRecommendations(dimensionScores, responses) {
    const recommendations = []

    // Emotional wellbeing recommendations
    if (dimensionScores.emotional < 3) {
      recommendations.push({
        category: 'EMOTIONAL',
        title: 'Emotional Support Resources',
        suggestions: [
          'Practice daily mindfulness or meditation',
          'Keep a mood journal',
          'Connect with the school counselor',
          'Try stress-reduction techniques'
        ]
      })
    }

    // Social wellbeing recommendations
    if (dimensionScores.social < 3) {
      recommendations.push({
        category: 'SOCIAL',
        title: 'Social Connection Building',
        suggestions: [
          'Join a club or extracurricular activity',
          'Participate in study groups',
          'Reach out to a friend or classmate',
          'Consider peer mentoring programs'
        ]
      })
    }

    // Physical wellbeing recommendations
    if (dimensionScores.physical < 3) {
      recommendations.push({
        category: 'PHYSICAL',
        title: 'Physical Health Improvement',
        suggestions: [
          'Establish a regular sleep schedule',
          'Incorporate physical activity into your routine',
          'Practice good nutrition habits',
          'Take regular breaks from screen time'
        ]
      })
    }

    // Academic wellbeing recommendations
    if (dimensionScores.academic < 3) {
      recommendations.push({
        category: 'ACADEMIC',
        title: 'Academic Support Strategies',
        suggestions: [
          'Break large tasks into smaller, manageable steps',
          'Use time management tools and techniques',
          'Seek help from teachers or tutors when needed',
          'Create a dedicated study space'
        ]
      })
    }

    return recommendations
  }

  static determineFollowUpActions(riskLevel, alerts) {
    const actions = []

    if (riskLevel === 'HIGH') {
      actions.push({
        action: 'IMMEDIATE_COUNSELOR_CONTACT',
        timeline: 'Within 24 hours',
        description: 'School counselor should reach out immediately'
      })
      actions.push({
        action: 'PARENT_NOTIFICATION',
        timeline: 'Within 48 hours',
        description: 'Notify parents/guardians of concerns'
      })
    }

    if (riskLevel === 'MEDIUM') {
      actions.push({
        action: 'SCHEDULED_CHECK_IN',
        timeline: 'Within 1 week',
        description: 'Schedule follow-up assessment'
      })
    }

    // Add specific actions based on alerts
    alerts.forEach(alert => {
      if (alert.action === 'NOTIFY_COUNSELOR') {
        actions.push({
          action: 'COUNSELOR_REFERRAL',
          timeline: 'Immediate',
          description: 'Refer to school counselor for professional support'
        })
      }
    })

    return actions
  }

  static getQuestionDimension(questionId) {
    // Map question IDs to dimensions
    const dimensionMap = {
      'daily_mood': 'emotional',
      'stress_level': 'emotional',
      'sleep_quality': 'physical',
      'social_connection': 'social',
      'academic_confidence': 'academic'
    }

    return dimensionMap[questionId] || 'emotional'
  }

  static normalizeResponse(response) {
    // Convert various response types to 1-5 scale
    if (typeof response === 'number') {
      if (response <= 10) {
        return (response / 10) * 5 // Convert 1-10 scale to 1-5
      }
      return response
    }

    if (typeof response === 'string') {
      const moodValues = {
        'Excellent': 5, 'Good': 4, 'Fair': 3, 'Poor': 2, 'Very Poor': 1
      }
      return moodValues[response] || 3
    }

    return 3 // Default neutral
  }

  static generateAssessmentId() {
    return `wellbeing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static createWellbeingTrend(studentId, assessmentHistory) {
    const trends = {
      overall: [],
      dimensions: {},
      alerts: [],
      improvements: [],
      concerns: []
    }

    // Calculate trends over time
    assessmentHistory.forEach((assessment, index) => {
      if (assessment.results) {
        trends.overall.push({
          date: assessment.createdAt,
          score: assessment.results.overallScore,
          riskLevel: assessment.results.riskLevel
        })

        Object.keys(assessment.results.dimensionScores).forEach(dimension => {
          if (!trends.dimensions[dimension]) {
            trends.dimensions[dimension] = []
          }
          trends.dimensions[dimension].push({
            date: assessment.createdAt,
            score: assessment.results.dimensionScores[dimension]
          })
        })
      }
    })

    // Identify patterns and concerns
    if (trends.overall.length >= 2) {
      const recent = trends.overall.slice(-3) // Last 3 assessments
      const declining = recent.every((assessment, index) => 
        index === 0 || assessment.score < recent[index - 1].score
      )

      if (declining) {
        trends.concerns.push({
          type: 'DECLINING_WELLBEING',
          description: 'Overall wellbeing scores have been declining',
          severity: 'MEDIUM'
        })
      }
    }

    return trends
  }
}
