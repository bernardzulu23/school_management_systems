/**
 * Team Challenge System
 * Advanced collaborative learning and competition features
 */

export class TeamChallengeSystem {
  static CHALLENGE_TYPES = {
    ACADEMIC_QUEST: 'academic_quest',
    SKILL_BUILDING: 'skill_building',
    RESEARCH_PROJECT: 'research_project',
    CREATIVE_CHALLENGE: 'creative_challenge',
    PROBLEM_SOLVING: 'problem_solving',
    COMMUNITY_SERVICE: 'community_service',
    INNOVATION_LAB: 'innovation_lab'
  }

  static TEAM_SIZES = {
    SOLO: { min: 1, max: 1, name: 'Solo Challenge' },
    PAIR: { min: 2, max: 2, name: 'Pair Programming' },
    SMALL: { min: 3, max: 4, name: 'Small Team' },
    MEDIUM: { min: 5, max: 8, name: 'Medium Team' },
    LARGE: { min: 9, max: 15, name: 'Large Team' },
    CLASS: { min: 16, max: 30, name: 'Class Challenge' }
  }

  static CHALLENGE_TEMPLATES = {
    math_olympics: {
      id: 'math_olympics',
      name: 'Mathematics Olympics',
      description: 'Compete in advanced mathematical problem-solving',
      type: 'ACADEMIC_QUEST',
      duration: 7, // days
      teamSize: 'SMALL',
      subjects: ['Mathematics'],
      difficulty: 'hard',
      rewards: {
        winner: { points: 500, nft: 'golden_medal', title: 'Math Champion' },
        participant: { points: 100, badge: 'math_competitor' }
      },
      phases: [
        {
          name: 'Preparation Phase',
          duration: 2,
          tasks: ['Study advanced topics', 'Practice problem sets', 'Team strategy meeting']
        },
        {
          name: 'Qualification Round',
          duration: 1,
          tasks: ['Complete qualifying exam', 'Submit team solutions']
        },
        {
          name: 'Final Competition',
          duration: 1,
          tasks: ['Live problem-solving session', 'Present solutions', 'Peer evaluation']
        }
      ]
    },
    science_fair: {
      id: 'science_fair',
      name: 'Virtual Science Fair',
      description: 'Design and present innovative science projects',
      type: 'RESEARCH_PROJECT',
      duration: 21, // days
      teamSize: 'MEDIUM',
      subjects: ['Physics', 'Chemistry', 'Biology'],
      difficulty: 'medium',
      rewards: {
        winner: { points: 800, nft: 'innovation_trophy', title: 'Science Innovator' },
        finalist: { points: 400, nft: 'research_medal' },
        participant: { points: 150, badge: 'science_explorer' }
      },
      phases: [
        {
          name: 'Project Planning',
          duration: 7,
          tasks: ['Choose research topic', 'Form hypothesis', 'Design experiment', 'Create timeline']
        },
        {
          name: 'Research & Development',
          duration: 10,
          tasks: ['Conduct experiments', 'Collect data', 'Analyze results', 'Create presentation']
        },
        {
          name: 'Presentation & Judging',
          duration: 4,
          tasks: ['Submit project', 'Present to judges', 'Peer review', 'Awards ceremony']
        }
      ]
    },
    global_classroom: {
      id: 'global_classroom',
      name: 'Global Classroom Exchange',
      description: 'Collaborate with students from around the world',
      type: 'COMMUNITY_SERVICE',
      duration: 14,
      teamSize: 'LARGE',
      subjects: ['Social Studies', 'Geography', 'Languages'],
      difficulty: 'medium',
      rewards: {
        completion: { points: 300, nft: 'global_citizen', badge: 'world_connector' }
      },
      phases: [
        {
          name: 'Cultural Exchange',
          duration: 5,
          tasks: ['Connect with international partners', 'Share cultural presentations', 'Language practice']
        },
        {
          name: 'Collaborative Project',
          duration: 7,
          tasks: ['Work on joint project', 'Regular video conferences', 'Document collaboration']
        },
        {
          name: 'Showcase & Reflection',
          duration: 2,
          tasks: ['Present joint outcomes', 'Reflect on experience', 'Plan future connections']
        }
      ]
    }
  }

  static createChallenge(challengeData) {
    const template = this.CHALLENGE_TEMPLATES[challengeData.templateId]
    if (!template) throw new Error('Invalid challenge template')

    return {
      id: this.generateChallengeId(),
      ...template,
      customizations: challengeData.customizations || {},
      startDate: challengeData.startDate || new Date(),
      endDate: this.calculateEndDate(challengeData.startDate, template.duration),
      participants: [],
      teams: [],
      status: 'REGISTRATION_OPEN',
      createdBy: challengeData.createdBy,
      createdAt: new Date(),
      leaderboard: [],
      submissions: [],
      announcements: []
    }
  }

  static registerTeam(challengeId, teamData) {
    const team = {
      id: this.generateTeamId(),
      challengeId,
      name: teamData.name,
      members: teamData.members,
      captain: teamData.captain,
      motto: teamData.motto || '',
      avatar: teamData.avatar || '👥',
      registeredAt: new Date(),
      status: 'ACTIVE',
      progress: {
        currentPhase: 0,
        completedTasks: [],
        points: 0,
        submissions: []
      },
      collaboration: {
        chatHistory: [],
        sharedDocuments: [],
        meetingNotes: [],
        taskAssignments: []
      }
    }

    return team
  }

  static updateTeamProgress(teamId, progressData) {
    return {
      teamId,
      updatedAt: new Date(),
      progress: {
        ...progressData,
        lastActivity: new Date()
      },
      pointsEarned: this.calculateProgressPoints(progressData),
      achievements: this.checkTeamAchievements(progressData)
    }
  }

  static calculateProgressPoints(progressData) {
    let points = 0
    
    // Points for task completion
    points += progressData.completedTasks?.length * 10 || 0
    
    // Bonus points for early completion
    if (progressData.earlyCompletion) {
      points += 50
    }
    
    // Quality bonus
    if (progressData.qualityRating >= 4) {
      points += 25
    }
    
    // Collaboration bonus
    if (progressData.collaborationScore >= 80) {
      points += 30
    }
    
    return points
  }

  static generateChallengeId() {
    return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateTeamId() {
    return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static calculateEndDate(startDate, duration) {
    const end = new Date(startDate)
    end.setDate(end.getDate() + duration)
    return end
  }
}

/**
 * Social Learning Network
 * Peer-to-peer learning and mentorship system
 */
export class SocialLearningNetwork {
  static INTERACTION_TYPES = {
    STUDY_GROUP: 'study_group',
    PEER_TUTORING: 'peer_tutoring',
    PROJECT_COLLABORATION: 'project_collaboration',
    KNOWLEDGE_SHARING: 'knowledge_sharing',
    MENTORSHIP: 'mentorship',
    DISCUSSION_FORUM: 'discussion_forum'
  }

  static STUDY_GROUP_TYPES = {
    SUBJECT_FOCUSED: {
      name: 'Subject-Focused Group',
      description: 'Deep dive into specific subject areas',
      maxMembers: 8,
      duration: 'ongoing'
    },
    EXAM_PREP: {
      name: 'Exam Preparation',
      description: 'Intensive preparation for upcoming exams',
      maxMembers: 6,
      duration: 'temporary'
    },
    SKILL_BUILDING: {
      name: 'Skill Building Circle',
      description: 'Develop specific skills together',
      maxMembers: 10,
      duration: 'project-based'
    },
    HOMEWORK_HELP: {
      name: 'Homework Help Network',
      description: 'Mutual assistance with daily assignments',
      maxMembers: 12,
      duration: 'ongoing'
    }
  }

  static createStudyGroup(groupData) {
    return {
      id: this.generateGroupId(),
      name: groupData.name,
      description: groupData.description,
      type: groupData.type,
      subject: groupData.subject,
      creator: groupData.creator,
      members: [groupData.creator],
      maxMembers: this.STUDY_GROUP_TYPES[groupData.type].maxMembers,
      isPublic: groupData.isPublic || true,
      tags: groupData.tags || [],
      schedule: groupData.schedule || {},
      resources: {
        sharedNotes: [],
        studyMaterials: [],
        practiceQuestions: [],
        recordings: []
      },
      activities: {
        discussions: [],
        studySessions: [],
        achievements: [],
        milestones: []
      },
      settings: {
        allowInvites: true,
        requireApproval: false,
        notificationsEnabled: true
      },
      createdAt: new Date(),
      lastActivity: new Date()
    }
  }

  static createMentorshipPair(mentorId, menteeId, subject) {
    return {
      id: this.generateMentorshipId(),
      mentor: mentorId,
      mentee: menteeId,
      subject: subject,
      status: 'ACTIVE',
      startDate: new Date(),
      goals: [],
      sessions: [],
      progress: {
        sessionsCompleted: 0,
        goalsAchieved: 0,
        improvementMetrics: {}
      },
      feedback: {
        mentorRating: null,
        menteeRating: null,
        comments: []
      },
      schedule: {
        frequency: 'weekly',
        duration: 60, // minutes
        preferredTimes: []
      }
    }
  }

  static createKnowledgePost(postData) {
    return {
      id: this.generatePostId(),
      author: postData.author,
      title: postData.title,
      content: postData.content,
      type: postData.type, // 'question', 'explanation', 'resource', 'discussion'
      subject: postData.subject,
      tags: postData.tags || [],
      difficulty: postData.difficulty || 'medium',
      attachments: postData.attachments || [],
      interactions: {
        likes: 0,
        shares: 0,
        bookmarks: 0,
        comments: [],
        helpfulVotes: 0
      },
      visibility: postData.visibility || 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'published'
    }
  }

  static generateGroupId() {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateMentorshipId() {
    return `mentorship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generatePostId() {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static matchMentorMentee(mentorProfile, menteeProfile) {
    const compatibility = {
      subjectMatch: this.calculateSubjectCompatibility(mentorProfile.subjects, menteeProfile.needsHelp),
      scheduleMatch: this.calculateScheduleCompatibility(mentorProfile.availability, menteeProfile.availability),
      personalityMatch: this.calculatePersonalityCompatibility(mentorProfile.personality, menteeProfile.personality),
      experienceGap: this.calculateExperienceGap(mentorProfile.experience, menteeProfile.experience)
    }

    const overallScore = (
      compatibility.subjectMatch * 0.4 +
      compatibility.scheduleMatch * 0.3 +
      compatibility.personalityMatch * 0.2 +
      compatibility.experienceGap * 0.1
    )

    return {
      score: overallScore,
      compatibility,
      recommendation: overallScore > 0.7 ? 'HIGHLY_RECOMMENDED' : 
                     overallScore > 0.5 ? 'RECOMMENDED' : 'CONSIDER'
    }
  }

  static calculateSubjectCompatibility(mentorSubjects, menteeNeeds) {
    const overlap = mentorSubjects.filter(subject => menteeNeeds.includes(subject))
    return overlap.length / Math.max(mentorSubjects.length, menteeNeeds.length)
  }

  static calculateScheduleCompatibility(mentorAvailability, menteeAvailability) {
    // Simplified calculation - in reality would be more complex
    const commonSlots = mentorAvailability.filter(slot => 
      menteeAvailability.some(menteeSlot => 
        slot.day === menteeSlot.day && 
        this.timeOverlap(slot.time, menteeSlot.time)
      )
    )
    return commonSlots.length / Math.max(mentorAvailability.length, menteeAvailability.length)
  }

  static calculatePersonalityCompatibility(mentorPersonality, menteePersonality) {
    // Simplified personality matching
    const traits = ['patience', 'communication', 'enthusiasm', 'supportiveness']
    let compatibility = 0
    
    traits.forEach(trait => {
      const diff = Math.abs(mentorPersonality[trait] - menteePersonality[trait])
      compatibility += (5 - diff) / 5 // Normalize to 0-1
    })
    
    return compatibility / traits.length
  }

  static calculateExperienceGap(mentorExp, menteeExp) {
    const gap = mentorExp - menteeExp
    return gap >= 1 && gap <= 3 ? 1 : Math.max(0, 1 - Math.abs(gap - 2) / 3)
  }

  static timeOverlap(time1, time2) {
    // Simplified time overlap check
    return time1.start < time2.end && time2.start < time1.end
  }
}
