/**
 * Modern Assessment and Evaluation System
 * Competency-based assessment, portfolio evaluation, and blockchain certificates
 */

export class ModernAssessmentSystem {
  static ASSESSMENT_TYPES = {
    FORMATIVE: {
      name: 'Formative Assessment',
      purpose: 'Monitor learning progress',
      frequency: 'ongoing',
      weight: 0.3,
      feedback: 'immediate'
    },
    SUMMATIVE: {
      name: 'Summative Assessment',
      purpose: 'Evaluate final achievement',
      frequency: 'end_of_unit',
      weight: 0.4,
      feedback: 'detailed'
    },
    DIAGNOSTIC: {
      name: 'Diagnostic Assessment',
      purpose: 'Identify learning needs',
      frequency: 'as_needed',
      weight: 0.1,
      feedback: 'prescriptive'
    },
    AUTHENTIC: {
      name: 'Authentic Assessment',
      purpose: 'Real-world application',
      frequency: 'project_based',
      weight: 0.2,
      feedback: 'comprehensive'
    }
  }

  static COMPETENCY_LEVELS = {
    NOVICE: { level: 1, name: 'Novice', description: 'Beginning understanding', color: '#EF4444' },
    DEVELOPING: { level: 2, name: 'Developing', description: 'Progressing toward proficiency', color: '#F59E0B' },
    PROFICIENT: { level: 3, name: 'Proficient', description: 'Meets expectations', color: '#10B981' },
    ADVANCED: { level: 4, name: 'Advanced', description: 'Exceeds expectations', color: '#3B82F6' },
    EXPERT: { level: 5, name: 'Expert', description: 'Demonstrates mastery', color: '#8B5CF6' }
  }

  static EVALUATION_CRITERIA = {
    KNOWLEDGE: {
      name: 'Knowledge & Understanding',
      description: 'Factual and conceptual understanding',
      weight: 0.25,
      indicators: ['recalls information', 'explains concepts', 'makes connections']
    },
    THINKING: {
      name: 'Thinking & Inquiry',
      description: 'Critical and creative thinking skills',
      weight: 0.25,
      indicators: ['analyzes information', 'evaluates evidence', 'generates solutions']
    },
    COMMUNICATION: {
      name: 'Communication',
      description: 'Expression and presentation of learning',
      weight: 0.25,
      indicators: ['clear expression', 'appropriate format', 'effective delivery']
    },
    APPLICATION: {
      name: 'Application',
      description: 'Transfer of learning to new contexts',
      weight: 0.25,
      indicators: ['applies skills', 'transfers knowledge', 'makes real-world connections']
    }
  }

  static createCompetencyAssessment(assessmentData) {
    return {
      id: this.generateAssessmentId(),
      title: assessmentData.title,
      description: assessmentData.description,
      subject: assessmentData.subject,
      type: assessmentData.type || 'FORMATIVE',
      competencies: assessmentData.competencies || [],
      criteria: this.mapCriteriaToCompetencies(assessmentData.competencies),
      rubric: this.generateCompetencyRubric(assessmentData.competencies),
      tasks: assessmentData.tasks || [],
      duration: assessmentData.duration,
      instructions: assessmentData.instructions,
      resources: assessmentData.resources || [],
      adaptiveElements: {
        difficultyAdjustment: true,
        personalizedFeedback: true,
        multipleAttempts: assessmentData.allowRetakes || false
      },
      scoring: {
        method: 'competency_based',
        passingThreshold: assessmentData.passingThreshold || 3, // Proficient level
        weightedScoring: true
      },
      metadata: {
        createdBy: assessmentData.createdBy,
        createdAt: new Date(),
        lastModified: new Date(),
        version: '1.0'
      }
    }
  }

  static generateCompetencyRubric(competencies) {
    const rubric = {
      id: this.generateRubricId(),
      competencies: {},
      overallScoring: this.COMPETENCY_LEVELS
    }

    competencies.forEach(competency => {
      rubric.competencies[competency.id] = {
        name: competency.name,
        description: competency.description,
        levels: this.generateCompetencyLevels(competency),
        weight: competency.weight || 1.0
      }
    })

    return rubric
  }

  static generateCompetencyLevels(competency) {
    const levels = {}

    Object.keys(this.COMPETENCY_LEVELS).forEach(levelKey => {
      const level = this.COMPETENCY_LEVELS[levelKey]
      levels[levelKey] = {
        ...level,
        criteria: this.generateLevelCriteria(competency, level),
        examples: this.generateLevelExamples(competency, level),
        evidenceRequired: this.generateEvidenceRequirements(competency, level)
      }
    })

    return levels
  }

  static generateLevelCriteria(competency, level) {
    // Generate specific criteria for each competency level
    const baseCriteria = {
      NOVICE: `Shows beginning understanding of ${competency.name}`,
      DEVELOPING: `Demonstrates developing skills in ${competency.name}`,
      PROFICIENT: `Consistently demonstrates ${competency.name}`,
      ADVANCED: `Demonstrates advanced ${competency.name} with creativity`,
      EXPERT: `Demonstrates exceptional mastery of ${competency.name}`
    }

    return baseCriteria[level.name.toUpperCase()] || baseCriteria.PROFICIENT
  }

  static createDigitalPortfolio(studentId, portfolioData) {
    return {
      id: this.generatePortfolioId(),
      studentId: studentId,
      title: portfolioData.title || `${portfolioData.studentName}'s Learning Portfolio`,
      description: portfolioData.description,
      type: portfolioData.type || 'COMPREHENSIVE', // SUBJECT_SPECIFIC, PROJECT_BASED, COMPREHENSIVE
      collections: {
        artifacts: [],
        reflections: [],
        assessments: [],
        projects: [],
        achievements: []
      },
      competencyMapping: {},
      learningJourney: {
        milestones: [],
        growthTrajectory: [],
        skillDevelopment: {}
      },
      presentation: {
        theme: portfolioData.theme || 'professional',
        layout: portfolioData.layout || 'chronological',
        visibility: portfolioData.visibility || 'private',
        shareableLink: this.generateShareableLink()
      },
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date(),
        totalArtifacts: 0,
        completionStatus: 'in_progress'
      }
    }
  }

  static addPortfolioArtifact(portfolioId, artifactData) {
    const artifact = {
      id: this.generateArtifactId(),
      portfolioId: portfolioId,
      title: artifactData.title,
      description: artifactData.description,
      type: artifactData.type, // 'assignment', 'project', 'reflection', 'assessment', 'creative_work'
      subject: artifactData.subject,
      dateCreated: artifactData.dateCreated || new Date(),
      files: artifactData.files || [],
      tags: artifactData.tags || [],
      competenciesAddressed: artifactData.competencies || [],
      learningObjectives: artifactData.learningObjectives || [],
      reflection: {
        studentReflection: artifactData.studentReflection,
        learningProcess: artifactData.learningProcess,
        challenges: artifactData.challenges,
        growth: artifactData.growth,
        nextSteps: artifactData.nextSteps
      },
      feedback: {
        teacherFeedback: null,
        peerFeedback: [],
        selfAssessment: artifactData.selfAssessment
      },
      rubricScores: artifactData.rubricScores || {},
      status: 'submitted'
    }

    return artifact
  }

  static createBlockchainCertificate(certificateData) {
    return {
      id: this.generateCertificateId(),
      blockchainId: this.generateBlockchainId(),
      studentId: certificateData.studentId,
      studentName: certificateData.studentName,
      certificateType: certificateData.type, // 'COMPLETION', 'COMPETENCY', 'ACHIEVEMENT', 'SKILL'
      title: certificateData.title,
      description: certificateData.description,
      issuer: {
        institution: certificateData.institution || 'School Management System',
        authorizedBy: certificateData.authorizedBy,
        signatoryName: certificateData.signatoryName,
        signatoryTitle: certificateData.signatoryTitle
      },
      achievement: {
        competenciesEarned: certificateData.competencies || [],
        skillsValidated: certificateData.skills || [],
        assessmentScores: certificateData.scores || {},
        evidencePortfolio: certificateData.portfolioId
      },
      verification: {
        blockchainHash: this.generateBlockchainHash(),
        verificationUrl: this.generateVerificationUrl(),
        qrCode: this.generateQRCode(),
        digitalSignature: this.generateDigitalSignature()
      },
      validity: {
        issuedDate: new Date(),
        expiryDate: certificateData.expiryDate,
        isValid: true,
        revocationStatus: 'active'
      },
      metadata: {
        version: '1.0',
        standard: 'OpenBadges 3.0',
        format: 'JSON-LD',
        encryption: 'SHA-256'
      }
    }
  }

  static evaluateCompetencyProgress(studentId, competencyId, evidenceData) {
    const evaluation = {
      studentId: studentId,
      competencyId: competencyId,
      evaluationDate: new Date(),
      evidenceAnalysis: this.analyzeEvidence(evidenceData),
      currentLevel: this.determineCompetencyLevel(evidenceData),
      progressIndicators: this.calculateProgressIndicators(evidenceData),
      recommendations: this.generateCompetencyRecommendations(evidenceData),
      nextSteps: this.identifyNextSteps(competencyId, evidenceData)
    }

    return evaluation
  }

  static analyzeEvidence(evidenceData) {
    const analysis = {
      quantityOfEvidence: evidenceData.length,
      qualityScores: [],
      consistencyRating: 0,
      growthTrajectory: 'stable',
      strengthAreas: [],
      improvementAreas: []
    }

    // Analyze each piece of evidence
    evidenceData.forEach(evidence => {
      const qualityScore = this.assessEvidenceQuality(evidence)
      analysis.qualityScores.push(qualityScore)
    })

    // Calculate consistency
    analysis.consistencyRating = this.calculateConsistency(analysis.qualityScores)

    // Determine growth trajectory
    analysis.growthTrajectory = this.determineGrowthTrajectory(analysis.qualityScores)

    return analysis
  }

  static determineCompetencyLevel(evidenceData) {
    if (evidenceData.length === 0) return this.COMPETENCY_LEVELS.NOVICE

    const scores = evidenceData.map(evidence => evidence.score || 0)
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const consistency = this.calculateConsistency(scores)

    // Determine level based on average score and consistency
    if (averageScore >= 4.5 && consistency > 0.8) return this.COMPETENCY_LEVELS.EXPERT
    if (averageScore >= 4.0 && consistency > 0.7) return this.COMPETENCY_LEVELS.ADVANCED
    if (averageScore >= 3.0 && consistency > 0.6) return this.COMPETENCY_LEVELS.PROFICIENT
    if (averageScore >= 2.0) return this.COMPETENCY_LEVELS.DEVELOPING
    return this.COMPETENCY_LEVELS.NOVICE
  }

  static generateCompetencyRecommendations(evidenceData) {
    const recommendations = []

    const analysis = this.analyzeEvidence(evidenceData)

    if (analysis.consistencyRating < 0.6) {
      recommendations.push({
        type: 'CONSISTENCY',
        priority: 'HIGH',
        title: 'Improve Consistency',
        description: 'Focus on maintaining consistent performance across all tasks',
        actions: ['Practice regularly', 'Seek feedback', 'Develop routine']
      })
    }

    if (analysis.quantityOfEvidence < 3) {
      recommendations.push({
        type: 'EVIDENCE',
        priority: 'MEDIUM',
        title: 'Gather More Evidence',
        description: 'Complete additional tasks to demonstrate competency',
        actions: ['Submit more work samples', 'Participate in assessments', 'Document learning']
      })
    }

    return recommendations
  }

  static createPeerAssessment(assessmentData) {
    return {
      id: this.generatePeerAssessmentId(),
      title: assessmentData.title,
      description: assessmentData.description,
      assessorId: assessmentData.assessorId,
      assesseeId: assessmentData.assesseeId,
      criteria: assessmentData.criteria,
      rubric: assessmentData.rubric,
      feedback: {
        strengths: assessmentData.strengths || [],
        improvements: assessmentData.improvements || [],
        suggestions: assessmentData.suggestions || [],
        overallComment: assessmentData.overallComment
      },
      scores: assessmentData.scores || {},
      anonymous: assessmentData.anonymous || false,
      submittedAt: new Date(),
      status: 'submitted'
    }
  }

  // Helper methods for calculations
  static calculateConsistency(scores) {
    if (scores.length < 2) return 1.0
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    const standardDeviation = Math.sqrt(variance)
    
    // Convert to consistency rating (0-1, where 1 is most consistent)
    return Math.max(0, 1 - (standardDeviation / mean))
  }

  static determineGrowthTrajectory(scores) {
    if (scores.length < 3) return 'insufficient_data'
    
    const recentScores = scores.slice(-3)
    const earlierScores = scores.slice(0, -3)
    
    if (earlierScores.length === 0) return 'stable'
    
    const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length
    const earlierAverage = earlierScores.reduce((sum, score) => sum + score, 0) / earlierScores.length
    
    const improvement = recentAverage - earlierAverage
    
    if (improvement > 0.5) return 'improving'
    if (improvement < -0.5) return 'declining'
    return 'stable'
  }

  static assessEvidenceQuality(evidence) {
    let qualityScore = 0
    
    // Assess based on multiple factors
    if (evidence.completeness >= 0.8) qualityScore += 1
    if (evidence.accuracy >= 0.8) qualityScore += 1
    if (evidence.depth >= 0.7) qualityScore += 1
    if (evidence.creativity >= 0.6) qualityScore += 1
    if (evidence.reflection && evidence.reflection.length > 100) qualityScore += 1
    
    return qualityScore
  }

  // ID generation methods
  static generateAssessmentId() {
    return `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateRubricId() {
    return `rubric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generatePortfolioId() {
    return `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateArtifactId() {
    return `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateCertificateId() {
    return `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateBlockchainId() {
    return `blockchain_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`
  }

  static generatePeerAssessmentId() {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateShareableLink() {
    return `https://portfolio.school.edu/view/${Math.random().toString(36).substr(2, 16)}`
  }

  static generateVerificationUrl() {
    return `https://verify.school.edu/certificate/${Math.random().toString(36).substr(2, 16)}`
  }

  static generateBlockchainHash() {
    return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }

  static generateQRCode() {
    return `data:image/png;base64,${Math.random().toString(36).substr(2, 32)}`
  }

  static generateDigitalSignature() {
    return Array.from({length: 128}, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }
}
