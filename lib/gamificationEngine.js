/**
 * Gamification Engine - Achievement System and Interactive Features
 * Provides badges, points, leaderboards, and engagement mechanics
 */

/**
 * Achievement System
 * Manages badges, milestones, and recognition
 */
export class AchievementSystem {
  static ACHIEVEMENT_TYPES = {
    ACADEMIC: 'academic',
    ATTENDANCE: 'attendance',
    PARTICIPATION: 'participation',
    IMPROVEMENT: 'improvement',
    LEADERSHIP: 'leadership',
    SPECIAL: 'special'
  }

  static BADGE_LEVELS = {
    BRONZE: { level: 1, color: '#CD7F32', points: 10 },
    SILVER: { level: 2, color: '#C0C0C0', points: 25 },
    GOLD: { level: 3, color: '#FFD700', points: 50 },
    PLATINUM: { level: 4, color: '#E5E4E2', points: 100 },
    DIAMOND: { level: 5, color: '#B9F2FF', points: 200 }
  }

  static ACHIEVEMENTS = {
    // Academic Achievements
    PERFECT_SCORE: {
      id: 'perfect_score',
      name: 'Perfect Score',
      description: 'Achieved 100% on an assessment',
      type: this.ACHIEVEMENT_TYPES.ACADEMIC,
      icon: '🎯',
      levels: {
        BRONZE: { requirement: 1, name: 'First Perfect' },
        SILVER: { requirement: 3, name: 'Triple Perfect' },
        GOLD: { requirement: 5, name: 'Perfect Streak' },
        PLATINUM: { requirement: 10, name: 'Perfect Master' },
        DIAMOND: { requirement: 20, name: 'Perfect Legend' }
      }
    },

    HIGH_ACHIEVER: {
      id: 'high_achiever',
      name: 'High Achiever',
      description: 'Maintained high grades consistently',
      type: this.ACHIEVEMENT_TYPES.ACADEMIC,
      icon: '⭐',
      levels: {
        BRONZE: { requirement: 80, name: 'Good Student' },
        SILVER: { requirement: 85, name: 'Great Student' },
        GOLD: { requirement: 90, name: 'Excellent Student' },
        PLATINUM: { requirement: 95, name: 'Outstanding Student' },
        DIAMOND: { requirement: 98, name: 'Academic Star' }
      }
    },

    ATTENDANCE_CHAMPION: {
      id: 'attendance_champion',
      name: 'Attendance Champion',
      description: 'Excellent attendance record',
      type: this.ACHIEVEMENT_TYPES.ATTENDANCE,
      icon: '📅',
      levels: {
        BRONZE: { requirement: 90, name: 'Regular Attendee' },
        SILVER: { requirement: 95, name: 'Reliable Student' },
        GOLD: { requirement: 98, name: 'Perfect Attendance' },
        PLATINUM: { requirement: 100, name: 'Never Miss' },
        DIAMOND: { requirement: 100, name: 'Attendance Legend', duration: 365 }
      }
    },

    IMPROVEMENT_STAR: {
      id: 'improvement_star',
      name: 'Improvement Star',
      description: 'Showed significant academic improvement',
      type: this.ACHIEVEMENT_TYPES.IMPROVEMENT,
      icon: '📈',
      levels: {
        BRONZE: { requirement: 10, name: 'Getting Better' },
        SILVER: { requirement: 20, name: 'Great Progress' },
        GOLD: { requirement: 30, name: 'Amazing Growth' },
        PLATINUM: { requirement: 40, name: 'Transformation' },
        DIAMOND: { requirement: 50, name: 'Miracle Worker' }
      }
    },

    ASSIGNMENT_MASTER: {
      id: 'assignment_master',
      name: 'Assignment Master',
      description: 'Completed assignments on time consistently',
      type: this.ACHIEVEMENT_TYPES.PARTICIPATION,
      icon: '📝',
      levels: {
        BRONZE: { requirement: 10, name: 'Responsible' },
        SILVER: { requirement: 25, name: 'Dedicated' },
        GOLD: { requirement: 50, name: 'Committed' },
        PLATINUM: { requirement: 100, name: 'Assignment Pro' },
        DIAMOND: { requirement: 200, name: 'Assignment Legend' }
      }
    },

    SUBJECT_SPECIALIST: {
      id: 'subject_specialist',
      name: 'Subject Specialist',
      description: 'Excelled in a specific subject',
      type: this.ACHIEVEMENT_TYPES.ACADEMIC,
      icon: '🎓',
      levels: {
        BRONZE: { requirement: 85, name: 'Subject Fan' },
        SILVER: { requirement: 90, name: 'Subject Expert' },
        GOLD: { requirement: 95, name: 'Subject Master' },
        PLATINUM: { requirement: 98, name: 'Subject Genius' },
        DIAMOND: { requirement: 100, name: 'Subject Legend' }
      }
    }
  }

  static evaluateAchievements(studentData) {
    const earnedAchievements = []
    const progress = {}

    Object.values(this.ACHIEVEMENTS).forEach(achievement => {
      const result = this.checkAchievement(achievement, studentData)
      if (result.earned) {
        earnedAchievements.push(result)
      }
      progress[achievement.id] = result.progress
    })

    return { earnedAchievements, progress }
  }

  static checkAchievement(achievement, studentData) {
    const result = {
      achievement,
      earned: false,
      level: null,
      progress: 0,
      nextLevel: null,
      points: 0
    }

    let currentValue = 0

    switch (achievement.id) {
      case 'perfect_score':
        currentValue = this.countPerfectScores(studentData.grades || [])
        break
      
      case 'high_achiever':
        currentValue = this.calculateAverageGrade(studentData.grades || [])
        break
      
      case 'attendance_champion':
        currentValue = this.calculateAttendanceRate(studentData.attendance || [])
        break
      
      case 'improvement_star':
        currentValue = this.calculateImprovement(studentData.grades || [])
        break
      
      case 'assignment_master':
        currentValue = this.countCompletedAssignments(studentData.assignments || [])
        break
      
      case 'subject_specialist':
        currentValue = this.getHighestSubjectAverage(studentData.grades || [])
        break
    }

    // Check each level
    const levels = Object.keys(achievement.levels).reverse() // Start from highest
    for (const levelName of levels) {
      const level = achievement.levels[levelName]
      if (currentValue >= level.requirement) {
        result.earned = true
        result.level = levelName
        result.points = this.BADGE_LEVELS[levelName].points
        break
      }
    }

    // Calculate progress to next level
    if (!result.earned) {
      const nextLevel = Object.keys(achievement.levels)[0] // Bronze
      const requirement = achievement.levels[nextLevel].requirement
      result.progress = Math.min((currentValue / requirement) * 100, 100)
      result.nextLevel = nextLevel
    } else {
      // Find next level if current is not the highest
      const currentLevelIndex = Object.keys(achievement.levels).indexOf(result.level)
      if (currentLevelIndex < Object.keys(achievement.levels).length - 1) {
        const nextLevelName = Object.keys(achievement.levels)[currentLevelIndex + 1]
        const nextRequirement = achievement.levels[nextLevelName].requirement
        result.progress = Math.min((currentValue / nextRequirement) * 100, 100)
        result.nextLevel = nextLevelName
      } else {
        result.progress = 100 // Max level achieved
      }
    }

    return result
  }

  static countPerfectScores(grades) {
    return grades.filter(grade => grade.score === 100).length
  }

  static calculateAverageGrade(grades) {
    if (grades.length === 0) return 0
    return grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length
  }

  static calculateAttendanceRate(attendance) {
    if (attendance.length === 0) return 0
    const presentDays = attendance.filter(day => day.status === 'present').length
    return (presentDays / attendance.length) * 100
  }

  static calculateImprovement(grades) {
    if (grades.length < 2) return 0
    const sortedGrades = grades.sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstGrade = sortedGrades[0].score
    const lastGrade = sortedGrades[sortedGrades.length - 1].score
    return Math.max(0, lastGrade - firstGrade)
  }

  static countCompletedAssignments(assignments) {
    return assignments.filter(assignment => assignment.status === 'completed').length
  }

  static getHighestSubjectAverage(grades) {
    const subjectAverages = {}
    grades.forEach(grade => {
      if (!subjectAverages[grade.subject]) {
        subjectAverages[grade.subject] = []
      }
      subjectAverages[grade.subject].push(grade.score)
    })

    let highest = 0
    Object.values(subjectAverages).forEach(scores => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
      highest = Math.max(highest, average)
    })

    return highest
  }
}

/**
 * Points System
 * Manages point earning and spending mechanics
 */
export class PointsSystem {
  static POINT_SOURCES = {
    ASSIGNMENT_COMPLETION: { points: 10, description: 'Completed assignment on time' },
    PERFECT_ATTENDANCE_DAY: { points: 5, description: 'Perfect attendance for the day' },
    HIGH_GRADE: { points: 20, description: 'Scored above 90% on assessment' },
    IMPROVEMENT: { points: 15, description: 'Improved grade from previous assessment' },
    PARTICIPATION: { points: 8, description: 'Active class participation' },
    HELPING_PEER: { points: 12, description: 'Helped a classmate' },
    EARLY_SUBMISSION: { points: 5, description: 'Submitted assignment early' },
    PERFECT_SCORE: { points: 50, description: 'Achieved 100% on assessment' },
    STREAK_BONUS: { points: 25, description: 'Maintained performance streak' }
  }

  static POINT_REWARDS = {
    EXTRA_CREDIT: { cost: 100, description: 'Earn 5 extra credit points' },
    HOMEWORK_PASS: { cost: 150, description: 'Skip one homework assignment' },
    CHOOSE_SEAT: { cost: 75, description: 'Choose your seat for a week' },
    EARLY_LUNCH: { cost: 50, description: 'Go to lunch 5 minutes early' },
    MUSIC_CHOICE: { cost: 80, description: 'Choose background music for class' },
    TEACHER_ASSISTANT: { cost: 200, description: 'Be teacher assistant for a day' },
    SPECIAL_RECOGNITION: { cost: 300, description: 'Special recognition in assembly' }
  }

  static calculatePointsEarned(activities) {
    let totalPoints = 0
    const breakdown = []

    activities.forEach(activity => {
      const pointSource = this.POINT_SOURCES[activity.type]
      if (pointSource) {
        const points = pointSource.points * (activity.multiplier || 1)
        totalPoints += points
        breakdown.push({
          activity: activity.type,
          description: pointSource.description,
          points,
          date: activity.date
        })
      }
    })

    return { totalPoints, breakdown }
  }

  static getAvailableRewards(currentPoints) {
    return Object.entries(this.POINT_REWARDS)
      .map(([id, reward]) => ({
        id,
        ...reward,
        affordable: currentPoints >= reward.cost
      }))
      .sort((a, b) => a.cost - b.cost)
  }
}

/**
 * Leaderboard System
 * Manages competitive rankings and social features
 */
export class LeaderboardSystem {
  static LEADERBOARD_TYPES = {
    OVERALL_POINTS: 'overall_points',
    ACADEMIC_PERFORMANCE: 'academic_performance',
    ATTENDANCE: 'attendance',
    IMPROVEMENT: 'improvement',
    ASSIGNMENTS: 'assignments',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly'
  }

  static generateLeaderboard(students, type, timeframe = 'all') {
    const scoredStudents = students.map(student => ({
      ...student,
      score: this.calculateScore(student, type, timeframe),
      rank: 0,
      change: this.calculateRankChange(student, type)
    }))

    // Sort by score and assign ranks
    scoredStudents.sort((a, b) => b.score - a.score)
    scoredStudents.forEach((student, index) => {
      student.rank = index + 1
    })

    return {
      type,
      timeframe,
      students: scoredStudents,
      generatedAt: new Date(),
      totalParticipants: students.length
    }
  }

  static calculateScore(student, type, timeframe) {
    switch (type) {
      case this.LEADERBOARD_TYPES.OVERALL_POINTS:
        return student.totalPoints || 0
      
      case this.LEADERBOARD_TYPES.ACADEMIC_PERFORMANCE:
        return this.calculateAverageGrade(student.grades || [])
      
      case this.LEADERBOARD_TYPES.ATTENDANCE:
        return this.calculateAttendanceRate(student.attendance || [])
      
      case this.LEADERBOARD_TYPES.IMPROVEMENT:
        return this.calculateImprovement(student.grades || [])
      
      case this.LEADERBOARD_TYPES.ASSIGNMENTS:
        return this.calculateAssignmentScore(student.assignments || [])
      
      default:
        return 0
    }
  }

  static calculateAverageGrade(grades) {
    if (grades.length === 0) return 0
    return grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length
  }

  static calculateAttendanceRate(attendance) {
    if (attendance.length === 0) return 0
    const presentDays = attendance.filter(day => day.status === 'present').length
    return (presentDays / attendance.length) * 100
  }

  static calculateImprovement(grades) {
    if (grades.length < 2) return 0
    const sortedGrades = grades.sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstHalf = sortedGrades.slice(0, Math.floor(sortedGrades.length / 2))
    const secondHalf = sortedGrades.slice(Math.floor(sortedGrades.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, g) => sum + g.score, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, g) => sum + g.score, 0) / secondHalf.length
    
    return Math.max(0, secondAvg - firstAvg)
  }

  static calculateAssignmentScore(assignments) {
    const completed = assignments.filter(a => a.status === 'completed').length
    const onTime = assignments.filter(a => a.status === 'completed' && !a.late).length
    const total = assignments.length
    
    if (total === 0) return 0
    
    const completionRate = (completed / total) * 100
    const punctualityBonus = (onTime / total) * 20
    
    return completionRate + punctualityBonus
  }

  static calculateRankChange(student, type) {
    // This would compare with previous period's ranking
    // For now, return random change for demo
    return Math.floor(Math.random() * 6) - 3 // -3 to +3
  }
}

/**
 * Interactive Features
 * Manages polls, challenges, and social interactions
 */
export class InteractiveFeatures {
  static POLL_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    YES_NO: 'yes_no',
    RATING: 'rating',
    TEXT: 'text'
  }

  static CHALLENGE_TYPES = {
    ACADEMIC: 'academic',
    ATTENDANCE: 'attendance',
    PARTICIPATION: 'participation',
    TEAM: 'team'
  }

  static createPoll(pollData) {
    return {
      id: this.generateId(),
      title: pollData.title,
      description: pollData.description,
      type: pollData.type,
      options: pollData.options || [],
      responses: [],
      createdAt: new Date(),
      expiresAt: pollData.expiresAt,
      isActive: true,
      allowAnonymous: pollData.allowAnonymous || false,
      allowMultiple: pollData.allowMultiple || false
    }
  }

  static submitPollResponse(poll, userId, response) {
    if (!poll.isActive || (poll.expiresAt && new Date() > poll.expiresAt)) {
      throw new Error('Poll is no longer active')
    }

    if (!poll.allowMultiple && poll.responses.some(r => r.userId === userId)) {
      throw new Error('User has already responded to this poll')
    }

    poll.responses.push({
      userId: poll.allowAnonymous ? null : userId,
      response,
      submittedAt: new Date()
    })

    return this.calculatePollResults(poll)
  }

  static calculatePollResults(poll) {
    const results = {
      totalResponses: poll.responses.length,
      breakdown: {}
    }

    if (poll.type === this.POLL_TYPES.MULTIPLE_CHOICE || poll.type === this.POLL_TYPES.YES_NO) {
      poll.options.forEach(option => {
        results.breakdown[option] = poll.responses.filter(r => r.response === option).length
      })
    } else if (poll.type === this.POLL_TYPES.RATING) {
      const ratings = poll.responses.map(r => Number(r.response)).filter(r => !isNaN(r))
      results.breakdown.average = ratings.length > 0 ? 
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
      results.breakdown.distribution = {}
      for (let i = 1; i <= 5; i++) {
        results.breakdown.distribution[i] = ratings.filter(r => r === i).length
      }
    }

    return results
  }

  static createChallenge(challengeData) {
    return {
      id: this.generateId(),
      title: challengeData.title,
      description: challengeData.description,
      type: challengeData.type,
      target: challengeData.target,
      reward: challengeData.reward,
      participants: [],
      startDate: challengeData.startDate || new Date(),
      endDate: challengeData.endDate,
      isActive: true,
      progress: {}
    }
  }

  static joinChallenge(challenge, userId) {
    if (!challenge.participants.includes(userId)) {
      challenge.participants.push(userId)
      challenge.progress[userId] = {
        current: 0,
        milestones: [],
        joinedAt: new Date()
      }
    }
  }

  static updateChallengeProgress(challenge, userId, progress) {
    if (challenge.progress[userId]) {
      challenge.progress[userId].current = progress
      challenge.progress[userId].lastUpdated = new Date()
      
      // Check for milestone achievements
      this.checkChallengeMilestones(challenge, userId)
    }
  }

  static checkChallengeMilestones(challenge, userId) {
    const userProgress = challenge.progress[userId]
    const milestones = [25, 50, 75, 100] // Percentage milestones
    
    milestones.forEach(milestone => {
      const progressPercent = (userProgress.current / challenge.target) * 100
      if (progressPercent >= milestone && !userProgress.milestones.includes(milestone)) {
        userProgress.milestones.push(milestone)
        // Award milestone points
        this.awardMilestonePoints(userId, milestone)
      }
    })
  }

  static awardMilestonePoints(userId, milestone) {
    const points = milestone === 100 ? 100 : milestone / 4 * 10 // 25% = 25 points, 100% = 100 points
    // This would integrate with the points system
    console.log(`Awarded ${points} points to user ${userId} for ${milestone}% milestone`)
  }

  static generateId() {
    return Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Skill Tree System
 * Advanced progression system with branching skill paths
 */
export class SkillTreeSystem {
  static SKILL_CATEGORIES = {
    MATHEMATICS: 'mathematics',
    SCIENCE: 'science',
    LANGUAGE: 'language',
    ARTS: 'arts',
    SOCIAL: 'social',
    TECHNOLOGY: 'technology',
    LEADERSHIP: 'leadership',
    COLLABORATION: 'collaboration'
  }

  static SKILL_TREES = {
    [this.SKILL_CATEGORIES.MATHEMATICS]: {
      name: 'Mathematical Mastery',
      icon: '🔢',
      color: '#4F46E5',
      skills: {
        basic_arithmetic: {
          id: 'basic_arithmetic',
          name: 'Basic Arithmetic',
          description: 'Master addition, subtraction, multiplication, division',
          level: 1,
          prerequisites: [],
          maxLevel: 5,
          unlocks: ['algebra_fundamentals', 'geometry_basics'],
          rewards: { points: 50, badge: 'arithmetic_master' }
        },
        algebra_fundamentals: {
          id: 'algebra_fundamentals',
          name: 'Algebra Fundamentals',
          description: 'Solve equations and work with variables',
          level: 2,
          prerequisites: ['basic_arithmetic'],
          maxLevel: 5,
          unlocks: ['advanced_algebra', 'trigonometry'],
          rewards: { points: 100, badge: 'algebra_wizard' }
        },
        geometry_basics: {
          id: 'geometry_basics',
          name: 'Geometry Basics',
          description: 'Understand shapes, angles, and spatial relationships',
          level: 2,
          prerequisites: ['basic_arithmetic'],
          maxLevel: 5,
          unlocks: ['advanced_geometry', 'trigonometry'],
          rewards: { points: 100, badge: 'geometry_explorer' }
        },
        advanced_algebra: {
          id: 'advanced_algebra',
          name: 'Advanced Algebra',
          description: 'Complex equations, polynomials, and functions',
          level: 3,
          prerequisites: ['algebra_fundamentals'],
          maxLevel: 5,
          unlocks: ['calculus_prep'],
          rewards: { points: 200, badge: 'algebra_master', nft: 'golden_equation' }
        },
        trigonometry: {
          id: 'trigonometry',
          name: 'Trigonometry',
          description: 'Sine, cosine, tangent, and triangle relationships',
          level: 3,
          prerequisites: ['algebra_fundamentals', 'geometry_basics'],
          maxLevel: 5,
          unlocks: ['calculus_prep'],
          rewards: { points: 200, badge: 'trig_navigator', nft: 'sine_wave' }
        },
        calculus_prep: {
          id: 'calculus_prep',
          name: 'Pre-Calculus',
          description: 'Limits, derivatives preparation, and advanced functions',
          level: 4,
          prerequisites: ['advanced_algebra', 'trigonometry'],
          maxLevel: 5,
          unlocks: ['calculus_master'],
          rewards: { points: 300, badge: 'calculus_ready', nft: 'infinity_symbol' }
        },
        calculus_master: {
          id: 'calculus_master',
          name: 'Calculus Master',
          description: 'Derivatives, integrals, and advanced mathematical concepts',
          level: 5,
          prerequisites: ['calculus_prep'],
          maxLevel: 5,
          unlocks: [],
          rewards: { points: 500, badge: 'calculus_legend', nft: 'mathematical_crown', title: 'Math Virtuoso' }
        }
      }
    },
    [this.SKILL_CATEGORIES.SCIENCE]: {
      name: 'Scientific Discovery',
      icon: '🔬',
      color: '#059669',
      skills: {
        observation_skills: {
          id: 'observation_skills',
          name: 'Scientific Observation',
          description: 'Develop keen observation and data collection skills',
          level: 1,
          prerequisites: [],
          maxLevel: 5,
          unlocks: ['hypothesis_formation', 'lab_safety'],
          rewards: { points: 50, badge: 'keen_observer' }
        },
        hypothesis_formation: {
          id: 'hypothesis_formation',
          name: 'Hypothesis Formation',
          description: 'Create testable scientific hypotheses',
          level: 2,
          prerequisites: ['observation_skills'],
          maxLevel: 5,
          unlocks: ['experimental_design', 'data_analysis'],
          rewards: { points: 100, badge: 'hypothesis_hero' }
        },
        lab_safety: {
          id: 'lab_safety',
          name: 'Laboratory Safety',
          description: 'Master safe laboratory practices and procedures',
          level: 2,
          prerequisites: ['observation_skills'],
          maxLevel: 5,
          unlocks: ['experimental_design'],
          rewards: { points: 75, badge: 'safety_champion' }
        },
        experimental_design: {
          id: 'experimental_design',
          name: 'Experimental Design',
          description: 'Design controlled scientific experiments',
          level: 3,
          prerequisites: ['hypothesis_formation', 'lab_safety'],
          maxLevel: 5,
          unlocks: ['advanced_research'],
          rewards: { points: 150, badge: 'experiment_architect', nft: 'lab_blueprint' }
        },
        data_analysis: {
          id: 'data_analysis',
          name: 'Data Analysis',
          description: 'Analyze and interpret scientific data',
          level: 3,
          prerequisites: ['hypothesis_formation'],
          maxLevel: 5,
          unlocks: ['advanced_research'],
          rewards: { points: 150, badge: 'data_detective', nft: 'graph_master' }
        },
        advanced_research: {
          id: 'advanced_research',
          name: 'Advanced Research',
          description: 'Conduct independent scientific research projects',
          level: 4,
          prerequisites: ['experimental_design', 'data_analysis'],
          maxLevel: 5,
          unlocks: ['science_mentor'],
          rewards: { points: 250, badge: 'research_pioneer', nft: 'discovery_medal' }
        },
        science_mentor: {
          id: 'science_mentor',
          name: 'Science Mentor',
          description: 'Guide and teach other students in scientific methods',
          level: 5,
          prerequisites: ['advanced_research'],
          maxLevel: 5,
          unlocks: [],
          rewards: { points: 400, badge: 'science_sage', nft: 'mentor_crown', title: 'Science Guru' }
        }
      }
    }
  }

  static getStudentSkillProgress(studentId, skillTreeData) {
    const progress = {}

    Object.keys(this.SKILL_TREES).forEach(category => {
      progress[category] = {
        totalSkills: Object.keys(this.SKILL_TREES[category].skills).length,
        unlockedSkills: 0,
        masteredSkills: 0,
        availableSkills: [],
        nextUnlocks: []
      }

      Object.values(this.SKILL_TREES[category].skills).forEach(skill => {
        const studentSkill = skillTreeData[skill.id] || { level: 0, unlocked: false }

        if (studentSkill.unlocked) {
          progress[category].unlockedSkills++
          if (studentSkill.level >= skill.maxLevel) {
            progress[category].masteredSkills++
          }
        }

        if (this.isSkillAvailable(skill, skillTreeData)) {
          progress[category].availableSkills.push(skill)
        }

        if (studentSkill.level >= skill.maxLevel) {
          skill.unlocks.forEach(unlockId => {
            const unlockSkill = this.findSkillById(unlockId)
            if (unlockSkill && !skillTreeData[unlockId]?.unlocked) {
              progress[category].nextUnlocks.push(unlockSkill)
            }
          })
        }
      })
    })

    return progress
  }

  static isSkillAvailable(skill, skillTreeData) {
    if (skill.prerequisites.length === 0) return true

    return skill.prerequisites.every(prereqId => {
      const prereq = skillTreeData[prereqId]
      return prereq && prereq.unlocked && prereq.level >= 1
    })
  }

  static findSkillById(skillId) {
    for (const category of Object.values(this.SKILL_TREES)) {
      if (category.skills[skillId]) {
        return category.skills[skillId]
      }
    }
    return null
  }

  static unlockSkill(studentId, skillId, currentLevel = 1) {
    const skill = this.findSkillById(skillId)
    if (!skill) return null

    return {
      skillId,
      newLevel: currentLevel,
      unlocked: true,
      rewards: skill.rewards,
      unlockedSkills: skill.unlocks,
      timestamp: new Date()
    }
  }
}

/**
 * NFT-Style Achievement System
 * Blockchain-inspired digital collectibles and rare achievements
 */
export class NFTAchievementSystem {
  static NFT_RARITIES = {
    COMMON: { name: 'Common', color: '#9CA3AF', multiplier: 1, dropRate: 0.7 },
    UNCOMMON: { name: 'Uncommon', color: '#10B981', multiplier: 1.5, dropRate: 0.2 },
    RARE: { name: 'Rare', color: '#3B82F6', multiplier: 2, dropRate: 0.07 },
    EPIC: { name: 'Epic', color: '#8B5CF6', multiplier: 3, dropRate: 0.025 },
    LEGENDARY: { name: 'Legendary', color: '#F59E0B', multiplier: 5, dropRate: 0.004 },
    MYTHIC: { name: 'Mythic', color: '#EF4444', multiplier: 10, dropRate: 0.001 }
  }

  static NFT_COLLECTIONS = {
    ACADEMIC_MASTERY: {
      name: 'Academic Mastery Collection',
      description: 'Rare achievements for exceptional academic performance',
      nfts: {
        golden_equation: {
          id: 'golden_equation',
          name: 'Golden Equation',
          description: 'Awarded for mastering advanced algebra',
          rarity: 'RARE',
          image: '🏆📐',
          attributes: { subject: 'Mathematics', skill: 'Advanced Algebra', power: 85 },
          unlockCondition: { type: 'skill_mastery', skill: 'advanced_algebra', level: 5 }
        },
        sine_wave: {
          id: 'sine_wave',
          name: 'Sine Wave Master',
          description: 'Perfect understanding of trigonometric functions',
          rarity: 'EPIC',
          image: '🌊📊',
          attributes: { subject: 'Mathematics', skill: 'Trigonometry', power: 120 },
          unlockCondition: { type: 'perfect_scores', subject: 'trigonometry', count: 5 }
        },
        infinity_symbol: {
          id: 'infinity_symbol',
          name: 'Infinity Symbol',
          description: 'Transcended mathematical limitations',
          rarity: 'LEGENDARY',
          image: '∞✨',
          attributes: { subject: 'Mathematics', skill: 'Calculus Prep', power: 200 },
          unlockCondition: { type: 'skill_tree_completion', category: 'mathematics', percentage: 80 }
        }
      }
    },
    SCIENTIFIC_DISCOVERY: {
      name: 'Scientific Discovery Collection',
      description: 'Commemorating breakthrough moments in learning',
      nfts: {
        lab_blueprint: {
          id: 'lab_blueprint',
          name: 'Laboratory Blueprint',
          description: 'Master of experimental design',
          rarity: 'RARE',
          image: '🧪📋',
          attributes: { subject: 'Science', skill: 'Experimental Design', power: 90 },
          unlockCondition: { type: 'experiments_completed', count: 10 }
        },
        discovery_medal: {
          id: 'discovery_medal',
          name: 'Discovery Medal',
          description: 'Made significant scientific breakthrough',
          rarity: 'EPIC',
          image: '🏅🔬',
          attributes: { subject: 'Science', skill: 'Research', power: 150 },
          unlockCondition: { type: 'research_projects', quality: 'excellent', count: 3 }
        }
      }
    }
  }

  static generateNFT(studentId, nftId, achievementContext) {
    const nft = this.findNFTById(nftId)
    if (!nft) return null

    const rarity = this.NFT_RARITIES[nft.rarity]
    const uniqueId = this.generateUniqueNFTId(studentId, nftId)

    return {
      id: uniqueId,
      nftId: nftId,
      name: nft.name,
      description: nft.description,
      image: nft.image,
      rarity: nft.rarity,
      rarityData: rarity,
      attributes: {
        ...nft.attributes,
        mintedAt: new Date(),
        mintedBy: studentId,
        serialNumber: this.getNextSerialNumber(nftId),
        powerLevel: nft.attributes.power * rarity.multiplier,
        achievementContext
      },
      metadata: {
        blockchain: 'EduChain',
        contract: 'SchoolNFT',
        tokenStandard: 'ERC-721',
        verified: true
      }
    }
  }

  static findNFTById(nftId) {
    for (const collection of Object.values(this.NFT_COLLECTIONS)) {
      if (collection.nfts[nftId]) {
        return collection.nfts[nftId]
      }
    }
    return null
  }

  static generateUniqueNFTId(studentId, nftId) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${nftId}_${studentId}_${timestamp}_${random}`
  }

  static getNextSerialNumber(nftId) {
    // In a real implementation, this would query the database
    return Math.floor(Math.random() * 10000) + 1
  }

  static checkNFTUnlockConditions(studentData, nftId) {
    const nft = this.findNFTById(nftId)
    if (!nft) return false

    const condition = nft.unlockCondition

    switch (condition.type) {
      case 'skill_mastery':
        return studentData.skills?.[condition.skill]?.level >= condition.level

      case 'perfect_scores':
        const perfectScores = studentData.grades?.filter(g =>
          g.subject === condition.subject && g.score === 100
        ).length || 0
        return perfectScores >= condition.count

      case 'skill_tree_completion':
        const categoryProgress = studentData.skillTreeProgress?.[condition.category]
        return categoryProgress?.completionPercentage >= condition.percentage

      case 'experiments_completed':
        return studentData.experimentsCompleted >= condition.count

      case 'research_projects':
        const qualityProjects = studentData.researchProjects?.filter(p =>
          p.quality === condition.quality
        ).length || 0
        return qualityProjects >= condition.count

      default:
        return false
    }
  }
}

/**
 * Gamification Manager
 * Main class that coordinates all gamification features
 */
export class GamificationManager {
  constructor() {
    this.achievements = new AchievementSystem()
    this.points = new PointsSystem()
    this.leaderboards = new LeaderboardSystem()
    this.interactive = new InteractiveFeatures()
    this.skillTrees = new SkillTreeSystem()
    this.nftAchievements = new NFTAchievementSystem()
  }

  processStudentData(studentData) {
    // Evaluate achievements
    const achievementResults = AchievementSystem.evaluateAchievements(studentData)

    // Calculate points from recent activities
    const pointsResults = PointsSystem.calculatePointsEarned(studentData.recentActivities || [])

    // Process skill tree progress
    const skillProgress = SkillTreeSystem.getStudentSkillProgress(
      studentData.id,
      studentData.skillTreeData || {}
    )

    // Check for NFT unlocks
    const nftUnlocks = this.checkNFTUnlocks(studentData)

    return {
      achievements: achievementResults,
      points: pointsResults,
      totalPoints: studentData.totalPoints || 0,
      level: this.calculateStudentLevel(studentData.totalPoints || 0),
      nextLevelPoints: this.getNextLevelRequirement(studentData.totalPoints || 0),
      skillTrees: skillProgress,
      nftCollection: studentData.nftCollection || [],
      newNFTs: nftUnlocks
    }
  }

  checkNFTUnlocks(studentData) {
    const unlockedNFTs = []

    Object.values(NFTAchievementSystem.NFT_COLLECTIONS).forEach(collection => {
      Object.keys(collection.nfts).forEach(nftId => {
        if (NFTAchievementSystem.checkNFTUnlockConditions(studentData, nftId)) {
          const existingNFT = studentData.nftCollection?.find(nft => nft.nftId === nftId)
          if (!existingNFT) {
            const newNFT = NFTAchievementSystem.generateNFT(
              studentData.id,
              nftId,
              { trigger: 'achievement_unlock', timestamp: new Date() }
            )
            unlockedNFTs.push(newNFT)
          }
        }
      })
    })

    return unlockedNFTs
  }

  calculateStudentLevel(totalPoints) {
    const levels = [
      { level: 1, requirement: 0, name: 'Beginner' },
      { level: 2, requirement: 100, name: 'Student' },
      { level: 3, requirement: 300, name: 'Scholar' },
      { level: 4, requirement: 600, name: 'Achiever' },
      { level: 5, requirement: 1000, name: 'Expert' },
      { level: 6, requirement: 1500, name: 'Master' },
      { level: 7, requirement: 2500, name: 'Legend' }
    ]

    for (let i = levels.length - 1; i >= 0; i--) {
      if (totalPoints >= levels[i].requirement) {
        return levels[i]
      }
    }

    return levels[0]
  }

  getNextLevelRequirement(totalPoints) {
    const currentLevel = this.calculateStudentLevel(totalPoints)
    const levels = [100, 300, 600, 1000, 1500, 2500, 5000]
    
    for (const requirement of levels) {
      if (totalPoints < requirement) {
        return requirement - totalPoints
      }
    }
    
    return 0 // Max level reached
  }
}
