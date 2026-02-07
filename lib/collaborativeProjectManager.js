/**
 * Collaborative Project Management System
 * Team projects, task management, and collaborative workflows
 */

export class CollaborativeProjectManager {
  static PROJECT_TYPES = {
    RESEARCH: {
      name: 'Research Project',
      description: 'Academic research and investigation',
      phases: ['planning', 'research', 'analysis', 'writing', 'presentation'],
      duration: '8_weeks',
      teamSize: { min: 2, max: 5 }
    },
    CREATIVE: {
      name: 'Creative Project',
      description: 'Artistic and creative endeavors',
      phases: ['ideation', 'design', 'creation', 'refinement', 'showcase'],
      duration: '6_weeks',
      teamSize: { min: 1, max: 4 }
    },
    STEM: {
      name: 'STEM Project',
      description: 'Science, Technology, Engineering, Math projects',
      phases: ['problem_definition', 'design', 'prototyping', 'testing', 'optimization'],
      duration: '10_weeks',
      teamSize: { min: 3, max: 6 }
    },
    COMMUNITY_SERVICE: {
      name: 'Community Service Project',
      description: 'Projects that benefit the community',
      phases: ['needs_assessment', 'planning', 'implementation', 'evaluation', 'reflection'],
      duration: '12_weeks',
      teamSize: { min: 4, max: 8 }
    },
    BUSINESS: {
      name: 'Business Project',
      description: 'Entrepreneurship and business development',
      phases: ['market_research', 'business_plan', 'prototype', 'testing', 'pitch'],
      duration: '8_weeks',
      teamSize: { min: 2, max: 5 }
    }
  }

  static TASK_PRIORITIES = {
    CRITICAL: { level: 4, color: '#DC2626', label: 'Critical' },
    HIGH: { level: 3, color: '#EF4444', label: 'High' },
    MEDIUM: { level: 2, color: '#F59E0B', label: 'Medium' },
    LOW: { level: 1, color: '#10B981', label: 'Low' }
  }

  static COLLABORATION_ROLES = {
    PROJECT_MANAGER: {
      name: 'Project Manager',
      responsibilities: ['planning', 'coordination', 'timeline_management', 'communication'],
      permissions: ['edit_project', 'assign_tasks', 'manage_timeline', 'invite_members']
    },
    RESEARCHER: {
      name: 'Researcher',
      responsibilities: ['data_collection', 'analysis', 'documentation', 'fact_checking'],
      permissions: ['edit_research', 'add_resources', 'create_reports']
    },
    DESIGNER: {
      name: 'Designer',
      responsibilities: ['visual_design', 'user_experience', 'prototyping', 'aesthetics'],
      permissions: ['edit_design', 'upload_media', 'create_mockups']
    },
    DEVELOPER: {
      name: 'Developer',
      responsibilities: ['implementation', 'coding', 'testing', 'technical_documentation'],
      permissions: ['edit_code', 'manage_repository', 'deploy_solutions']
    },
    CONTENT_CREATOR: {
      name: 'Content Creator',
      responsibilities: ['writing', 'editing', 'content_strategy', 'storytelling'],
      permissions: ['edit_content', 'publish_articles', 'manage_media']
    },
    QUALITY_ASSURANCE: {
      name: 'Quality Assurance',
      responsibilities: ['testing', 'review', 'validation', 'improvement_suggestions'],
      permissions: ['review_deliverables', 'create_feedback', 'approve_submissions']
    }
  }

  static createCollaborativeProject(projectData) {
    const projectType = this.PROJECT_TYPES[projectData.type] || this.PROJECT_TYPES.RESEARCH

    return {
      id: this.generateProjectId(),
      title: projectData.title,
      description: projectData.description,
      type: projectData.type,
      subject: projectData.subject,
      creator: projectData.creator,
      team: {
        members: [projectData.creator],
        roles: { [projectData.creator.id]: 'PROJECT_MANAGER' },
        maxSize: projectType.teamSize.max,
        invitations: [],
        applications: []
      },
      timeline: {
        startDate: projectData.startDate || new Date(),
        endDate: this.calculateEndDate(projectData.startDate, projectType.duration),
        phases: this.generateProjectPhases(projectType.phases),
        currentPhase: projectType.phases[0],
        milestones: projectData.milestones || []
      },
      objectives: {
        primary: projectData.primaryObjectives || [],
        secondary: projectData.secondaryObjectives || [],
        learningOutcomes: projectData.learningOutcomes || [],
        successCriteria: projectData.successCriteria || []
      },
      workspace: {
        documents: [],
        resources: [],
        discussions: [],
        files: [],
        sharedNotes: '',
        kanbanBoard: this.createKanbanBoard(),
        calendar: this.createProjectCalendar()
      },
      tasks: [],
      deliverables: projectData.deliverables || [],
      collaboration: {
        communicationChannels: this.setupCommunicationChannels(projectData.id),
        meetingSchedule: [],
        sharedWorkspaces: [],
        versionControl: this.initializeVersionControl()
      },
      assessment: {
        rubric: projectData.rubric || this.generateDefaultRubric(projectData.type),
        peerEvaluation: projectData.peerEvaluation !== false,
        selfReflection: projectData.selfReflection !== false,
        mentorFeedback: projectData.mentorFeedback || false
      },
      progress: {
        overallProgress: 0,
        phaseProgress: {},
        taskCompletion: 0,
        qualityScore: 0,
        collaborationScore: 0
      },
      settings: {
        visibility: projectData.visibility || 'team_only',
        allowExternalCollaborators: projectData.allowExternalCollaborators || false,
        requireApprovalForChanges: projectData.requireApprovalForChanges || false,
        autoSave: projectData.autoSave !== false,
        notificationLevel: projectData.notificationLevel || 'medium'
      },
      status: 'planning', // planning, active, review, completed, archived
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
        totalHours: 0,
        version: '1.0'
      }
    }
  }

  static createProjectTask(taskData) {
    return {
      id: this.generateTaskId(),
      projectId: taskData.projectId,
      title: taskData.title,
      description: taskData.description,
      type: taskData.type, // research, design, development, review, presentation
      assignee: taskData.assignee,
      assignedBy: taskData.assignedBy,
      priority: taskData.priority || 'MEDIUM',
      status: 'todo', // todo, in_progress, review, completed, blocked
      phase: taskData.phase,
      dependencies: taskData.dependencies || [],
      subtasks: [],
      timeline: {
        createdAt: new Date(),
        startDate: taskData.startDate,
        dueDate: taskData.dueDate,
        estimatedHours: taskData.estimatedHours || 0,
        actualHours: 0,
        completedAt: null
      },
      deliverables: taskData.deliverables || [],
      resources: taskData.resources || [],
      collaboration: {
        comments: [],
        attachments: [],
        collaborators: taskData.collaborators || [],
        reviewers: taskData.reviewers || []
      },
      quality: {
        acceptanceCriteria: taskData.acceptanceCriteria || [],
        reviewStatus: 'pending',
        feedback: [],
        revisionCount: 0
      },
      tags: taskData.tags || [],
      metadata: {
        difficulty: taskData.difficulty || 'medium',
        skillsRequired: taskData.skillsRequired || [],
        learningObjectives: taskData.learningObjectives || []
      }
    }
  }

  static createTeamFormation(formationData) {
    return {
      id: this.generateFormationId(),
      projectId: formationData.projectId,
      strategy: formationData.strategy, // random, skill_based, preference_based, balanced
      criteria: {
        skillBalance: formationData.skillBalance || true,
        personalityBalance: formationData.personalityBalance || false,
        scheduleCompatibility: formationData.scheduleCompatibility || true,
        previousCollaboration: formationData.previousCollaboration || 'neutral'
      },
      constraints: {
        maxTeamSize: formationData.maxTeamSize || 5,
        minTeamSize: formationData.minTeamSize || 2,
        requiredRoles: formationData.requiredRoles || [],
        excludedCombinations: formationData.excludedCombinations || []
      },
      preferences: {
        studentPreferences: formationData.studentPreferences || {},
        teacherPreferences: formationData.teacherPreferences || {},
        autoAssignment: formationData.autoAssignment || false
      },
      algorithm: {
        weightings: {
          skillCompatibility: 0.3,
          scheduleAlignment: 0.2,
          personalityFit: 0.2,
          previousExperience: 0.1,
          learningGoals: 0.2
        },
        iterations: 1000,
        optimizationGoal: 'balanced_teams'
      },
      results: {
        proposedTeams: [],
        alternativeOptions: [],
        unassignedStudents: [],
        satisfactionScore: 0
      },
      status: 'pending', // pending, processing, completed, manual_review
      metadata: {
        createdAt: new Date(),
        processedAt: null,
        approvedAt: null
      }
    }
  }

  static createCollaborationWorkflow(workflowData) {
    return {
      id: this.generateWorkflowId(),
      projectId: workflowData.projectId,
      name: workflowData.name,
      description: workflowData.description,
      type: workflowData.type, // approval, review, feedback, milestone
      trigger: workflowData.trigger, // task_completion, phase_change, deadline_approach
      steps: workflowData.steps.map(step => ({
        id: this.generateStepId(),
        name: step.name,
        type: step.type, // action, approval, notification, condition
        assignee: step.assignee,
        conditions: step.conditions || [],
        actions: step.actions || [],
        timeLimit: step.timeLimit,
        escalation: step.escalation
      })),
      automation: {
        enabled: workflowData.automation !== false,
        rules: workflowData.automationRules || [],
        notifications: workflowData.notifications || [],
        integrations: workflowData.integrations || []
      },
      tracking: {
        instances: [],
        completionRate: 0,
        averageTime: 0,
        bottlenecks: []
      },
      status: 'active', // active, paused, archived
      metadata: {
        createdAt: new Date(),
        lastTriggered: null,
        totalExecutions: 0
      }
    }
  }

  static manageProjectProgress(projectId, progressData) {
    const update = {
      projectId: projectId,
      timestamp: new Date(),
      type: progressData.type, // task_update, phase_completion, milestone_reached
      data: progressData.data,
      updatedBy: progressData.updatedBy
    }

    // Calculate overall progress
    const overallProgress = this.calculateOverallProgress(projectId, progressData)
    
    // Update phase progress
    const phaseProgress = this.calculatePhaseProgress(projectId, progressData)
    
    // Generate insights and recommendations
    const insights = this.generateProgressInsights(overallProgress, phaseProgress)
    
    // Check for risks and alerts
    const risks = this.assessProjectRisks(projectId, progressData)

    return {
      update: update,
      progress: {
        overall: overallProgress,
        phases: phaseProgress,
        tasks: this.calculateTaskProgress(projectId)
      },
      insights: insights,
      risks: risks,
      recommendations: this.generateProgressRecommendations(insights, risks),
      nextActions: this.identifyNextActions(projectId, progressData)
    }
  }

  static facilitatePeerReview(reviewData) {
    return {
      id: this.generateReviewId(),
      projectId: reviewData.projectId,
      deliverableId: reviewData.deliverableId,
      reviewer: reviewData.reviewer,
      reviewee: reviewData.reviewee,
      type: reviewData.type, // peer_review, expert_review, self_review
      criteria: reviewData.criteria || this.getDefaultReviewCriteria(),
      rubric: reviewData.rubric,
      timeline: {
        assignedAt: new Date(),
        dueDate: reviewData.dueDate,
        completedAt: null,
        remindersSent: 0
      },
      feedback: {
        strengths: [],
        improvements: [],
        suggestions: [],
        overallComment: '',
        scores: {},
        confidenceLevel: 0
      },
      process: {
        anonymous: reviewData.anonymous || false,
        structured: reviewData.structured !== false,
        collaborative: reviewData.collaborative || false,
        iterative: reviewData.iterative || false
      },
      quality: {
        helpfulness: 0,
        specificity: 0,
        constructiveness: 0,
        accuracy: 0
      },
      status: 'assigned', // assigned, in_progress, completed, overdue
      metadata: {
        reviewRound: reviewData.reviewRound || 1,
        previousReviews: [],
        followUpRequired: false
      }
    }
  }

  static createProjectPortfolio(portfolioData) {
    return {
      id: this.generatePortfolioId(),
      studentId: portfolioData.studentId,
      title: portfolioData.title || 'My Project Portfolio',
      description: portfolioData.description,
      projects: [],
      skills: {
        developed: [],
        demonstrated: [],
        certified: []
      },
      achievements: {
        projectCompletions: 0,
        leadershipRoles: 0,
        collaborationAwards: 0,
        innovationRecognitions: 0
      },
      reflection: {
        learningJourney: '',
        challengesOvercome: [],
        skillsGained: [],
        futureGoals: []
      },
      presentation: {
        theme: portfolioData.theme || 'professional',
        layout: portfolioData.layout || 'chronological',
        highlights: portfolioData.highlights || [],
        showcase: portfolioData.showcase || []
      },
      sharing: {
        visibility: portfolioData.visibility || 'private',
        shareableLink: this.generateShareableLink(),
        permissions: portfolioData.permissions || {}
      },
      analytics: {
        views: 0,
        downloads: 0,
        feedback: [],
        engagement: 0
      },
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0'
      }
    }
  }

  // Helper methods for calculations and data generation
  static generateProjectPhases(phaseNames) {
    return phaseNames.map((name, index) => ({
      id: `phase_${index + 1}`,
      name: name,
      order: index + 1,
      status: index === 0 ? 'active' : 'pending',
      startDate: null,
      endDate: null,
      progress: 0,
      tasks: [],
      deliverables: [],
      milestones: []
    }))
  }

  static createKanbanBoard() {
    return {
      columns: [
        { id: 'todo', name: 'To Do', tasks: [] },
        { id: 'in_progress', name: 'In Progress', tasks: [] },
        { id: 'review', name: 'Review', tasks: [] },
        { id: 'completed', name: 'Completed', tasks: [] }
      ],
      customColumns: [],
      settings: {
        swimlanes: false,
        wip_limits: { in_progress: 3, review: 2 },
        auto_move: true
      }
    }
  }

  static createProjectCalendar() {
    return {
      events: [],
      milestones: [],
      deadlines: [],
      meetings: [],
      reminders: [],
      settings: {
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        workingHours: { start: 9, end: 17 }
      }
    }
  }

  static setupCommunicationChannels(projectId) {
    return [
      {
        id: `${projectId}_general`,
        name: 'General Discussion',
        type: 'text',
        purpose: 'General project communication'
      },
      {
        id: `${projectId}_updates`,
        name: 'Project Updates',
        type: 'announcement',
        purpose: 'Important project announcements'
      },
      {
        id: `${projectId}_resources`,
        name: 'Resource Sharing',
        type: 'file_sharing',
        purpose: 'Share project resources and files'
      }
    ]
  }

  static initializeVersionControl() {
    return {
      enabled: true,
      repository: this.generateRepositoryId(),
      branches: ['main'],
      currentBranch: 'main',
      commits: [],
      collaborators: [],
      settings: {
        autoCommit: false,
        requireReview: true,
        backupFrequency: 'daily'
      }
    }
  }

  static generateDefaultRubric(projectType) {
    const commonCriteria = {
      'Content Quality': { weight: 0.3, levels: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'] },
      'Collaboration': { weight: 0.2, levels: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'] },
      'Presentation': { weight: 0.2, levels: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'] },
      'Process': { weight: 0.3, levels: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'] }
    }

    return {
      id: this.generateRubricId(),
      projectType: projectType,
      criteria: commonCriteria,
      totalPoints: 100,
      passingScore: 70
    }
  }

  static async calculateOverallProgress(projectId, progressData) {
    // This should be replaced with a call to the API
    // For example: return await api.get(`/projects/${projectId}/progress`, { progressData });
    return {
      percentage: 45,
      trend: 'on_track',
      velocity: 'normal',
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  }

  static async calculatePhaseProgress(projectId, progressData) {
    // This should be replaced with a call to the API
    // For example: return await api.get(`/projects/${projectId}/phase-progress`, { progressData });
    return {
      planning: { completed: true, progress: 100 },
      research: { completed: false, progress: 75 },
      analysis: { completed: false, progress: 20 },
      writing: { completed: false, progress: 0 },
      presentation: { completed: false, progress: 0 }
    }
  }

  static generateProgressInsights(overallProgress, phaseProgress) {
    return [
      {
        type: 'positive',
        message: 'Research phase is progressing well ahead of schedule',
        impact: 'medium'
      },
      {
        type: 'warning',
        message: 'Analysis phase may need additional resources',
        impact: 'low'
      }
    ]
  }

  static assessProjectRisks(projectId, progressData) {
    return [
      {
        type: 'timeline',
        level: 'low',
        description: 'Project is currently on track to meet deadlines',
        mitigation: 'Continue current pace and monitor weekly'
      }
    ]
  }

  static calculateEndDate(startDate, duration) {
    const start = new Date(startDate)
    const durationMap = {
      '6_weeks': 6 * 7,
      '8_weeks': 8 * 7,
      '10_weeks': 10 * 7,
      '12_weeks': 12 * 7
    }
    const days = durationMap[duration] || 56 // 8 weeks default
    return new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
  }

  // ID generation methods
  static generateProjectId() {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateFormationId() {
    return `formation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateStepId() {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateReviewId() {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generatePortfolioId() {
    return `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateRepositoryId() {
    return `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateRubricId() {
    return `rubric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateShareableLink() {
    return `https://portfolio.school.edu/project/${Math.random().toString(36).substr(2, 16)}`
  }
}
