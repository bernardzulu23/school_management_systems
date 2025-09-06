/**
 * Advanced Student Dashboard Features
 * Comprehensive educational tools for enhanced learning experience
 * Designed for rural Zambian schools with offline capabilities
 */

/**
 * Digital Library System
 * Offline access to educational books and resources
 */
export class DigitalLibrarySystem {
  constructor() {
    this.books = new Map()
    this.categories = new Map()
    this.userProgress = new Map()
    this.bookmarks = new Map()
    this.downloadedBooks = new Set()
    this.readingHistory = []
    
    this.initializeLibrary()
  }

  initializeLibrary() {
    // Initialize book categories
    this.categories.set('mathematics', {
      name: 'Mathematics',
      description: 'Math textbooks and problem sets',
      icon: '📐',
      books: []
    })
    
    this.categories.set('science', {
      name: 'Science',
      description: 'Physics, Chemistry, Biology resources',
      icon: '🔬',
      books: []
    })
    
    this.categories.set('english', {
      name: 'English',
      description: 'Literature and language resources',
      icon: '📚',
      books: []
    })
    
    this.categories.set('history', {
      name: 'History',
      description: 'Zambian and world history',
      icon: '🏛️',
      books: []
    })
    
    this.categories.set('local_languages', {
      name: 'Local Languages',
      description: 'Bemba, Tonga, Nyanja resources',
      icon: '🗣️',
      books: []
    })
    
    // Books should be added through the admin interface or API
    // TODO: Load books from database/API in production
    
    console.log('📚 Digital Library System initialized')
  }

  addBook(bookData) {
    const book = {
      ...bookData,
      id: bookData.id || this.generateBookId(),
      addedDate: new Date(),
      downloadCount: 0,
      rating: 0,
      reviews: []
    }
    
    this.books.set(book.id, book)
    
    // Add to category
    if (this.categories.has(book.category)) {
      this.categories.get(book.category).books.push(book.id)
    }
    
    return book
  }

  searchBooks(query, filters = {}) {
    const results = []
    const searchTerm = query.toLowerCase()
    
    for (const [bookId, book] of this.books) {
      let matches = false
      
      // Text search
      if (book.title.toLowerCase().includes(searchTerm) ||
          book.author.toLowerCase().includes(searchTerm) ||
          book.description.toLowerCase().includes(searchTerm)) {
        matches = true
      }
      
      // Apply filters
      if (matches && filters.category && book.category !== filters.category) {
        matches = false
      }
      
      if (matches && filters.grade && book.grade !== filters.grade && book.grade !== 'all') {
        matches = false
      }
      
      if (matches && filters.language && book.language !== filters.language) {
        matches = false
      }
      
      if (matches) {
        results.push(book)
      }
    }
    
    return results.sort((a, b) => b.downloadCount - a.downloadCount)
  }

  downloadBook(bookId, studentId) {
    const book = this.books.get(bookId)
    if (!book) return null
    
    // Simulate download for offline access
    this.downloadedBooks.add(bookId)
    book.downloadCount++
    
    // Track user download
    if (!this.userProgress.has(studentId)) {
      this.userProgress.set(studentId, {
        downloadedBooks: new Set(),
        readingProgress: new Map(),
        bookmarks: new Map()
      })
    }
    
    this.userProgress.get(studentId).downloadedBooks.add(bookId)
    
    console.log(`📥 Book "${book.title}" downloaded for offline access`)
    return book
  }

  getReadingProgress(studentId, bookId) {
    const userProgress = this.userProgress.get(studentId)
    if (!userProgress) return 0
    
    return userProgress.readingProgress.get(bookId) || 0
  }

  updateReadingProgress(studentId, bookId, progress) {
    if (!this.userProgress.has(studentId)) {
      this.userProgress.set(studentId, {
        downloadedBooks: new Set(),
        readingProgress: new Map(),
        bookmarks: new Map()
      })
    }
    
    this.userProgress.get(studentId).readingProgress.set(bookId, progress)
    
    // Add to reading history
    this.readingHistory.push({
      studentId,
      bookId,
      progress,
      timestamp: new Date()
    })
  }

  generateBookId() {
    return 'book_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Peer Study Groups System
 * Collaborative learning with classmates
 */
export class PeerStudyGroupSystem {
  constructor() {
    this.studyGroups = new Map()
    this.groupMembers = new Map()
    this.studySessions = new Map()
    this.groupMessages = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    console.log('👥 Peer Study Groups System initialized')
  }

  createStudyGroup(creatorId, groupData) {
    const group = {
      id: this.generateGroupId(),
      name: groupData.name,
      subject: groupData.subject,
      description: groupData.description,
      creatorId,
      members: [creatorId],
      maxMembers: groupData.maxMembers || 8,
      isPrivate: groupData.isPrivate || false,
      createdDate: new Date(),
      lastActivity: new Date(),
      studySessions: [],
      resources: []
    }
    
    this.studyGroups.set(group.id, group)
    this.groupMembers.set(group.id, new Set([creatorId]))
    this.groupMessages.set(group.id, [])
    
    console.log(`👥 Study group "${group.name}" created for ${group.subject}`)
    return group
  }

  joinStudyGroup(groupId, studentId) {
    const group = this.studyGroups.get(groupId)
    if (!group) return false
    
    if (group.members.length >= group.maxMembers) {
      console.log('❌ Study group is full')
      return false
    }
    
    group.members.push(studentId)
    this.groupMembers.get(groupId).add(studentId)
    group.lastActivity = new Date()
    
    // Send welcome message
    this.addGroupMessage(groupId, {
      type: 'system',
      message: `Student ${studentId} joined the group`,
      timestamp: new Date()
    })
    
    console.log(`✅ Student ${studentId} joined study group "${group.name}"`)
    return true
  }

  scheduleStudySession(groupId, sessionData) {
    const group = this.studyGroups.get(groupId)
    if (!group) return null
    
    const session = {
      id: this.generateSessionId(),
      groupId,
      title: sessionData.title,
      subject: sessionData.subject,
      scheduledTime: new Date(sessionData.scheduledTime),
      duration: sessionData.duration || 60, // minutes
      location: sessionData.location || 'Online',
      agenda: sessionData.agenda || [],
      attendees: [],
      status: 'scheduled'
    }
    
    this.studySessions.set(session.id, session)
    group.studySessions.push(session.id)
    
    // Notify group members
    this.addGroupMessage(groupId, {
      type: 'system',
      message: `Study session "${session.title}" scheduled for ${session.scheduledTime.toLocaleString()}`,
      timestamp: new Date()
    })
    
    console.log(`📅 Study session "${session.title}" scheduled`)
    return session
  }

  addGroupMessage(groupId, messageData) {
    if (!this.groupMessages.has(groupId)) {
      this.groupMessages.set(groupId, [])
    }
    
    const message = {
      id: this.generateMessageId(),
      senderId: messageData.senderId || 'system',
      type: messageData.type || 'text',
      content: messageData.message || messageData.content,
      timestamp: messageData.timestamp || new Date(),
      attachments: messageData.attachments || []
    }
    
    this.groupMessages.get(groupId).push(message)
    
    // Update group activity
    const group = this.studyGroups.get(groupId)
    if (group) {
      group.lastActivity = new Date()
    }
    
    return message
  }

  getStudyGroupsForStudent(studentId) {
    const groups = []
    
    for (const [groupId, group] of this.studyGroups) {
      if (group.members.includes(studentId)) {
        groups.push({
          ...group,
          memberCount: group.members.length,
          unreadMessages: this.getUnreadMessageCount(groupId, studentId)
        })
      }
    }
    
    return groups.sort((a, b) => b.lastActivity - a.lastActivity)
  }

  getUnreadMessageCount(groupId, studentId) {
    // Simplified - in real implementation, track read status
    return 0
  }

  generateGroupId() {
    return 'group_' + Math.random().toString(36).substr(2, 9)
  }

  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9)
  }

  generateMessageId() {
    return 'msg_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Learning Style Assessment System
 * Identify optimal learning methods for each student
 */
export class LearningStyleAssessment {
  constructor() {
    this.assessmentQuestions = []
    this.studentProfiles = new Map()
    this.learningStyles = new Map()
    
    this.initializeAssessment()
  }

  initializeAssessment() {
    // Define learning style categories
    this.learningStyles.set('visual', {
      name: 'Visual Learner',
      description: 'Learns best through seeing and visual aids',
      characteristics: [
        'Prefers charts, diagrams, and images',
        'Remembers faces better than names',
        'Likes to take notes and make lists',
        'Benefits from color-coding and highlighting'
      ],
      recommendations: [
        'Use mind maps and concept diagrams',
        'Watch educational videos',
        'Create visual study aids',
        'Use flashcards with images'
      ]
    })
    
    this.learningStyles.set('auditory', {
      name: 'Auditory Learner',
      description: 'Learns best through hearing and speaking',
      characteristics: [
        'Prefers listening to explanations',
        'Remembers names better than faces',
        'Enjoys discussions and verbal instructions',
        'Benefits from reading aloud'
      ],
      recommendations: [
        'Listen to recorded lessons',
        'Participate in study groups',
        'Read materials aloud',
        'Use music and rhymes for memorization'
      ]
    })
    
    this.learningStyles.set('kinesthetic', {
      name: 'Kinesthetic Learner',
      description: 'Learns best through hands-on activities',
      characteristics: [
        'Prefers hands-on activities',
        'Learns through movement and touch',
        'Enjoys experiments and practical work',
        'Benefits from taking breaks during study'
      ],
      recommendations: [
        'Use manipulatives and models',
        'Take frequent study breaks',
        'Practice through real-world applications',
        'Use gestures while learning'
      ]
    })
    
    this.learningStyles.set('reading_writing', {
      name: 'Reading/Writing Learner',
      description: 'Learns best through text and written materials',
      characteristics: [
        'Prefers reading and writing',
        'Enjoys taking detailed notes',
        'Learns well from textbooks',
        'Benefits from written instructions'
      ],
      recommendations: [
        'Take comprehensive notes',
        'Create written summaries',
        'Use textbooks and written materials',
        'Write practice essays and reports'
      ]
    })
    
    // Create assessment questions
    this.createAssessmentQuestions()
    
    console.log('🧠 Learning Style Assessment System initialized')
  }

  createAssessmentQuestions() {
    this.assessmentQuestions = [
      {
        id: 1,
        question: "When learning something new, I prefer to:",
        options: [
          { text: "See diagrams and pictures", style: 'visual', weight: 3 },
          { text: "Listen to explanations", style: 'auditory', weight: 3 },
          { text: "Try it hands-on", style: 'kinesthetic', weight: 3 },
          { text: "Read about it", style: 'reading_writing', weight: 3 }
        ]
      },
      {
        id: 2,
        question: "When I study, I like to:",
        options: [
          { text: "Use colorful notes and highlighters", style: 'visual', weight: 2 },
          { text: "Read my notes out loud", style: 'auditory', weight: 2 },
          { text: "Walk around while reviewing", style: 'kinesthetic', weight: 2 },
          { text: "Write detailed summaries", style: 'reading_writing', weight: 2 }
        ]
      },
      {
        id: 3,
        question: "I remember information best when:",
        options: [
          { text: "I can see it in my mind", style: 'visual', weight: 3 },
          { text: "I hear it repeated", style: 'auditory', weight: 3 },
          { text: "I practice doing it", style: 'kinesthetic', weight: 3 },
          { text: "I write it down", style: 'reading_writing', weight: 3 }
        ]
      },
      {
        id: 4,
        question: "In class, I learn best when the teacher:",
        options: [
          { text: "Uses the blackboard and visual aids", style: 'visual', weight: 2 },
          { text: "Explains things verbally", style: 'auditory', weight: 2 },
          { text: "Does demonstrations", style: 'kinesthetic', weight: 2 },
          { text: "Gives written instructions", style: 'reading_writing', weight: 2 }
        ]
      },
      {
        id: 5,
        question: "When solving problems, I:",
        options: [
          { text: "Draw diagrams or pictures", style: 'visual', weight: 2 },
          { text: "Talk through the problem", style: 'auditory', weight: 2 },
          { text: "Use objects or act it out", style: 'kinesthetic', weight: 2 },
          { text: "Write out the steps", style: 'reading_writing', weight: 2 }
        ]
      }
    ]
  }

  takeAssessment(studentId, responses) {
    const scores = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
      reading_writing: 0
    }
    
    // Calculate scores based on responses
    responses.forEach((response, questionIndex) => {
      const question = this.assessmentQuestions[questionIndex]
      const option = question.options[response]
      if (option) {
        scores[option.style] += option.weight
      }
    })
    
    // Determine primary and secondary learning styles
    const sortedStyles = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .map(([style, score]) => ({ style, score }))
    
    const profile = {
      studentId,
      primaryStyle: sortedStyles[0].style,
      secondaryStyle: sortedStyles[1].style,
      scores,
      assessmentDate: new Date(),
      recommendations: this.generateRecommendations(sortedStyles[0].style, sortedStyles[1].style)
    }
    
    this.studentProfiles.set(studentId, profile)
    
    console.log(`🧠 Learning style assessment completed for student ${studentId}`)
    console.log(`Primary style: ${profile.primaryStyle}, Secondary: ${profile.secondaryStyle}`)
    
    return profile
  }

  generateRecommendations(primaryStyle, secondaryStyle) {
    const primary = this.learningStyles.get(primaryStyle)
    const secondary = this.learningStyles.get(secondaryStyle)
    
    const recommendations = {
      studyTechniques: [...primary.recommendations],
      characteristics: [...primary.characteristics],
      additionalTips: secondary ? secondary.recommendations.slice(0, 2) : []
    }
    
    return recommendations
  }

  getStudentProfile(studentId) {
    return this.studentProfiles.get(studentId)
  }

  getPersonalizedStudyPlan(studentId) {
    const profile = this.studentProfiles.get(studentId)
    if (!profile) return null
    
    const primaryStyle = this.learningStyles.get(profile.primaryStyle)
    
    return {
      learningStyle: primaryStyle.name,
      studyTechniques: profile.recommendations.studyTechniques,
      dailyTips: this.getDailyTips(profile.primaryStyle),
      resourceSuggestions: this.getResourceSuggestions(profile.primaryStyle)
    }
  }

  getDailyTips(learningStyle) {
    const tips = {
      visual: [
        "Create colorful mind maps for complex topics",
        "Use diagrams to break down difficult concepts",
        "Watch educational videos when available"
      ],
      auditory: [
        "Read your notes aloud during review",
        "Form study groups for discussion",
        "Create songs or rhymes for memorization"
      ],
      kinesthetic: [
        "Take breaks every 20-30 minutes while studying",
        "Use hands-on activities when possible",
        "Practice concepts through real examples"
      ],
      reading_writing: [
        "Take detailed notes during lessons",
        "Rewrite important concepts in your own words",
        "Create written summaries after each study session"
      ]
    }
    
    return tips[learningStyle] || []
  }

  getResourceSuggestions(learningStyle) {
    const resources = {
      visual: [
        "Educational diagrams and charts",
        "Video lessons (when internet available)",
        "Colorful textbooks and materials"
      ],
      auditory: [
        "Audio recordings of lessons",
        "Discussion groups with classmates",
        "Verbal explanations from teachers"
      ],
      kinesthetic: [
        "Hands-on experiments and activities",
        "Physical models and manipulatives",
        "Real-world application exercises"
      ],
      reading_writing: [
        "Comprehensive textbooks",
        "Written practice exercises",
        "Note-taking materials"
      ]
    }
    
    return resources[learningStyle] || []
  }
}

/**
 * Academic Goal Setting System
 * Personal academic targets with progress tracking
 */
export class AcademicGoalSystem {
  constructor() {
    this.studentGoals = new Map()
    this.goalTemplates = new Map()
    this.achievements = new Map()

    this.initializeGoalTemplates()
  }

  initializeGoalTemplates() {
    // Create goal templates for common academic objectives
    this.goalTemplates.set('grade_improvement', {
      name: 'Grade Improvement',
      description: 'Improve grades in specific subjects',
      category: 'academic',
      defaultDuration: 90, // days
      milestones: [
        { percentage: 25, description: 'Complete first assessment' },
        { percentage: 50, description: 'Show consistent improvement' },
        { percentage: 75, description: 'Achieve target grade in practice' },
        { percentage: 100, description: 'Maintain target grade' }
      ]
    })

    this.goalTemplates.set('attendance_improvement', {
      name: 'Attendance Improvement',
      description: 'Improve school attendance rate',
      category: 'behavior',
      defaultDuration: 60,
      milestones: [
        { percentage: 25, description: 'One week perfect attendance' },
        { percentage: 50, description: 'Two weeks perfect attendance' },
        { percentage: 75, description: 'One month consistent attendance' },
        { percentage: 100, description: 'Achieve target attendance rate' }
      ]
    })

    this.goalTemplates.set('skill_mastery', {
      name: 'Skill Mastery',
      description: 'Master specific academic skills',
      category: 'skills',
      defaultDuration: 120,
      milestones: [
        { percentage: 25, description: 'Understand basic concepts' },
        { percentage: 50, description: 'Apply skills in practice' },
        { percentage: 75, description: 'Demonstrate proficiency' },
        { percentage: 100, description: 'Master and teach others' }
      ]
    })

    console.log('🎯 Academic Goal System initialized')
  }

  createGoal(studentId, goalData) {
    const goal = {
      id: this.generateGoalId(),
      studentId,
      title: goalData.title,
      description: goalData.description,
      category: goalData.category || 'academic',
      targetValue: goalData.targetValue,
      currentValue: goalData.currentValue || 0,
      unit: goalData.unit || 'points',
      startDate: new Date(goalData.startDate || Date.now()),
      targetDate: new Date(goalData.targetDate),
      status: 'active',
      priority: goalData.priority || 'medium',
      milestones: goalData.milestones || [],
      progress: 0,
      createdDate: new Date()
    }

    if (!this.studentGoals.has(studentId)) {
      this.studentGoals.set(studentId, [])
    }

    this.studentGoals.get(studentId).push(goal)

    console.log(`🎯 Goal "${goal.title}" created for student ${studentId}`)
    return goal
  }

  updateGoalProgress(studentId, goalId, newValue) {
    const goals = this.studentGoals.get(studentId)
    if (!goals) return null

    const goal = goals.find(g => g.id === goalId)
    if (!goal) return null

    goal.currentValue = newValue
    goal.progress = Math.min((newValue / goal.targetValue) * 100, 100)
    goal.lastUpdated = new Date()

    // Check for milestone achievements
    this.checkMilestones(goal)

    // Check if goal is completed
    if (goal.progress >= 100 && goal.status === 'active') {
      goal.status = 'completed'
      goal.completedDate = new Date()
      this.recordAchievement(studentId, goal)
    }

    console.log(`📈 Goal progress updated: ${goal.title} - ${goal.progress.toFixed(1)}%`)
    return goal
  }

  checkMilestones(goal) {
    goal.milestones.forEach(milestone => {
      if (goal.progress >= milestone.percentage && !milestone.achieved) {
        milestone.achieved = true
        milestone.achievedDate = new Date()
        console.log(`🏆 Milestone achieved: ${milestone.description}`)
      }
    })
  }

  recordAchievement(studentId, goal) {
    if (!this.achievements.has(studentId)) {
      this.achievements.set(studentId, [])
    }

    const achievement = {
      id: this.generateAchievementId(),
      goalId: goal.id,
      title: goal.title,
      description: `Completed goal: ${goal.description}`,
      category: goal.category,
      achievedDate: new Date(),
      points: this.calculateAchievementPoints(goal)
    }

    this.achievements.get(studentId).push(achievement)

    console.log(`🏆 Achievement unlocked: ${achievement.title}`)
    return achievement
  }

  calculateAchievementPoints(goal) {
    const basePoints = 100
    const priorityMultiplier = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.5
    }

    const durationBonus = goal.targetDate - goal.startDate > 90 * 24 * 60 * 60 * 1000 ? 1.2 : 1.0

    return Math.round(basePoints * priorityMultiplier[goal.priority] * durationBonus)
  }

  getStudentGoals(studentId, status = null) {
    const goals = this.studentGoals.get(studentId) || []

    if (status) {
      return goals.filter(goal => goal.status === status)
    }

    return goals.sort((a, b) => b.createdDate - a.createdDate)
  }

  getGoalAnalytics(studentId) {
    const goals = this.studentGoals.get(studentId) || []
    const achievements = this.achievements.get(studentId) || []

    const analytics = {
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      averageProgress: goals.length > 0 ?
        goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length : 0,
      totalAchievements: achievements.length,
      totalPoints: achievements.reduce((sum, ach) => sum + ach.points, 0),
      categoryBreakdown: this.getCategoryBreakdown(goals)
    }

    return analytics
  }

  getCategoryBreakdown(goals) {
    const breakdown = {}

    goals.forEach(goal => {
      if (!breakdown[goal.category]) {
        breakdown[goal.category] = {
          total: 0,
          completed: 0,
          averageProgress: 0
        }
      }

      breakdown[goal.category].total++
      if (goal.status === 'completed') {
        breakdown[goal.category].completed++
      }
    })

    // Calculate average progress for each category
    Object.keys(breakdown).forEach(category => {
      const categoryGoals = goals.filter(g => g.category === category)
      breakdown[category].averageProgress = categoryGoals.length > 0 ?
        categoryGoals.reduce((sum, goal) => sum + goal.progress, 0) / categoryGoals.length : 0
    })

    return breakdown
  }

  generateGoalId() {
    return 'goal_' + Math.random().toString(36).substr(2, 9)
  }

  generateAchievementId() {
    return 'ach_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Homework Reminder System
 * Smart reminders based on assignment due dates
 */
export class HomeworkReminderSystem {
  constructor() {
    this.assignments = new Map()
    this.reminders = new Map()
    this.studentPreferences = new Map()
    this.reminderHistory = []

    this.initializeSystem()
  }

  initializeSystem() {
    // Set up default reminder preferences
    this.defaultPreferences = {
      reminderTimes: [
        { days: 3, label: '3 days before' },
        { days: 1, label: '1 day before' },
        { hours: 2, label: '2 hours before' }
      ],
      methods: ['notification', 'sms'],
      quietHours: { start: 22, end: 6 }, // 10 PM to 6 AM
      enabled: true
    }

    console.log('⏰ Homework Reminder System initialized')
  }

  addAssignment(studentId, assignmentData) {
    const assignment = {
      id: this.generateAssignmentId(),
      studentId,
      title: assignmentData.title,
      subject: assignmentData.subject,
      description: assignmentData.description,
      dueDate: new Date(assignmentData.dueDate),
      estimatedTime: assignmentData.estimatedTime || 60, // minutes
      priority: assignmentData.priority || 'medium',
      status: 'pending',
      createdDate: new Date(),
      reminders: []
    }

    this.assignments.set(assignment.id, assignment)

    // Schedule reminders
    this.scheduleReminders(assignment)

    console.log(`📝 Assignment "${assignment.title}" added with due date ${assignment.dueDate.toLocaleDateString()}`)
    return assignment
  }

  scheduleReminders(assignment) {
    const preferences = this.getStudentPreferences(assignment.studentId)

    preferences.reminderTimes.forEach(reminderTime => {
      let reminderDate

      if (reminderTime.days) {
        reminderDate = new Date(assignment.dueDate.getTime() - (reminderTime.days * 24 * 60 * 60 * 1000))
      } else if (reminderTime.hours) {
        reminderDate = new Date(assignment.dueDate.getTime() - (reminderTime.hours * 60 * 60 * 1000))
      }

      // Don't schedule reminders in the past
      if (reminderDate > new Date()) {
        const reminder = {
          id: this.generateReminderId(),
          assignmentId: assignment.id,
          studentId: assignment.studentId,
          scheduledTime: reminderDate,
          type: reminderTime.label,
          status: 'scheduled',
          methods: preferences.methods
        }

        assignment.reminders.push(reminder.id)
        this.reminders.set(reminder.id, reminder)
      }
    })
  }

  getStudentPreferences(studentId) {
    return this.studentPreferences.get(studentId) || this.defaultPreferences
  }

  updateStudentPreferences(studentId, preferences) {
    this.studentPreferences.set(studentId, {
      ...this.defaultPreferences,
      ...preferences
    })

    console.log(`⚙️ Reminder preferences updated for student ${studentId}`)
  }

  checkPendingReminders() {
    const now = new Date()
    const pendingReminders = []

    for (const [reminderId, reminder] of this.reminders) {
      if (reminder.status === 'scheduled' && reminder.scheduledTime <= now) {
        const assignment = this.assignments.get(reminder.assignmentId)
        if (assignment && assignment.status === 'pending') {
          pendingReminders.push({ reminder, assignment })
          reminder.status = 'sent'
          reminder.sentTime = now
        }
      }
    }

    return pendingReminders
  }

  sendReminder(reminder, assignment) {
    const message = this.generateReminderMessage(reminder, assignment)

    // Record reminder in history
    this.reminderHistory.push({
      reminderId: reminder.id,
      studentId: reminder.studentId,
      assignmentId: assignment.id,
      message,
      sentTime: new Date(),
      methods: reminder.methods
    })

    console.log(`🔔 Reminder sent: ${message}`)

    // In a real implementation, this would trigger actual notifications
    return message
  }

  generateReminderMessage(reminder, assignment) {
    const timeUntilDue = assignment.dueDate.getTime() - new Date().getTime()
    const daysUntilDue = Math.ceil(timeUntilDue / (24 * 60 * 60 * 1000))
    const hoursUntilDue = Math.ceil(timeUntilDue / (60 * 60 * 1000))

    let timeText
    if (daysUntilDue > 1) {
      timeText = `${daysUntilDue} days`
    } else if (hoursUntilDue > 1) {
      timeText = `${hoursUntilDue} hours`
    } else {
      timeText = 'less than 1 hour'
    }

    return `📚 Reminder: "${assignment.title}" for ${assignment.subject} is due in ${timeText}. Estimated time: ${assignment.estimatedTime} minutes.`
  }

  markAssignmentCompleted(assignmentId) {
    const assignment = this.assignments.get(assignmentId)
    if (assignment) {
      assignment.status = 'completed'
      assignment.completedDate = new Date()

      // Cancel remaining reminders
      assignment.reminders.forEach(reminderId => {
        const reminder = this.reminders.get(reminderId)
        if (reminder && reminder.status === 'scheduled') {
          reminder.status = 'cancelled'
        }
      })

      console.log(`✅ Assignment "${assignment.title}" marked as completed`)
    }
  }

  getUpcomingAssignments(studentId, days = 7) {
    const cutoffDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000))
    const assignments = []

    for (const [assignmentId, assignment] of this.assignments) {
      if (assignment.studentId === studentId &&
          assignment.status === 'pending' &&
          assignment.dueDate <= cutoffDate) {
        assignments.push(assignment)
      }
    }

    return assignments.sort((a, b) => a.dueDate - b.dueDate)
  }

  getAssignmentStatistics(studentId) {
    const assignments = Array.from(this.assignments.values())
      .filter(a => a.studentId === studentId)

    const stats = {
      total: assignments.length,
      completed: assignments.filter(a => a.status === 'completed').length,
      pending: assignments.filter(a => a.status === 'pending').length,
      overdue: assignments.filter(a => a.status === 'pending' && a.dueDate < new Date()).length,
      completionRate: 0,
      averageCompletionTime: 0
    }

    if (stats.total > 0) {
      stats.completionRate = (stats.completed / stats.total) * 100
    }

    return stats
  }

  generateAssignmentId() {
    return 'assign_' + Math.random().toString(36).substr(2, 9)
  }

  generateReminderId() {
    return 'remind_' + Math.random().toString(36).substr(2, 9)
  }
}
