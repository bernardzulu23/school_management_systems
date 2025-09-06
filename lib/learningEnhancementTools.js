/**
 * Learning Enhancement Tools
 * Advanced learning tools including adaptive paths, concept mapping, flashcards, and analytics
 * Designed for personalized learning in rural Zambian schools
 */

/**
 * Adaptive Learning Paths System
 * Personalized learning routes based on student performance and learning style
 */
export class AdaptiveLearningPaths {
  constructor() {
    this.learningPaths = new Map()
    this.studentProgress = new Map()
    this.pathTemplates = new Map()
    this.assessmentData = new Map()
    this.recommendations = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    // Create learning path templates for different subjects
    this.createPathTemplate('mathematics_grade7', {
      subject: 'mathematics',
      grade: 7,
      name: 'Grade 7 Mathematics',
      description: 'Comprehensive mathematics learning path for Grade 7',
      modules: [
        {
          id: 'numbers_operations',
          name: 'Numbers and Operations',
          description: 'Basic number operations and properties',
          prerequisites: [],
          concepts: ['whole_numbers', 'fractions', 'decimals', 'percentages'],
          difficulty: 'beginner',
          estimatedHours: 20
        },
        {
          id: 'algebra_basics',
          name: 'Introduction to Algebra',
          description: 'Basic algebraic concepts and equations',
          prerequisites: ['numbers_operations'],
          concepts: ['variables', 'expressions', 'simple_equations'],
          difficulty: 'intermediate',
          estimatedHours: 15
        },
        {
          id: 'geometry_basics',
          name: 'Basic Geometry',
          description: 'Shapes, angles, and basic geometric properties',
          prerequisites: ['numbers_operations'],
          concepts: ['shapes', 'angles', 'perimeter', 'area'],
          difficulty: 'intermediate',
          estimatedHours: 18
        },
        {
          id: 'data_statistics',
          name: 'Data and Statistics',
          description: 'Data collection, organization, and basic statistics',
          prerequisites: ['numbers_operations'],
          concepts: ['data_collection', 'graphs', 'mean_median_mode'],
          difficulty: 'intermediate',
          estimatedHours: 12
        }
      ]
    })
    
    this.createPathTemplate('english_grade7', {
      subject: 'english',
      grade: 7,
      name: 'Grade 7 English',
      description: 'Comprehensive English learning path for Grade 7',
      modules: [
        {
          id: 'reading_comprehension',
          name: 'Reading Comprehension',
          description: 'Develop reading skills and understanding',
          prerequisites: [],
          concepts: ['main_idea', 'supporting_details', 'inference', 'vocabulary'],
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          id: 'grammar_basics',
          name: 'Grammar Fundamentals',
          description: 'Parts of speech and sentence structure',
          prerequisites: [],
          concepts: ['nouns', 'verbs', 'adjectives', 'sentence_structure'],
          difficulty: 'beginner',
          estimatedHours: 20
        },
        {
          id: 'writing_skills',
          name: 'Writing Skills',
          description: 'Paragraph and essay writing',
          prerequisites: ['grammar_basics'],
          concepts: ['paragraph_structure', 'essay_writing', 'descriptive_writing'],
          difficulty: 'intermediate',
          estimatedHours: 22
        },
        {
          id: 'literature_analysis',
          name: 'Literature Analysis',
          description: 'Understanding and analyzing literary texts',
          prerequisites: ['reading_comprehension'],
          concepts: ['character_analysis', 'plot_structure', 'themes'],
          difficulty: 'advanced',
          estimatedHours: 18
        }
      ]
    })
    
    console.log('🎯 Adaptive Learning Paths System initialized')
  }

  createPathTemplate(templateId, templateData) {
    this.pathTemplates.set(templateId, {
      id: templateId,
      ...templateData,
      createdDate: new Date()
    })
  }

  createPersonalizedPath(studentId, templateId, learningStyle = null, currentLevel = 'beginner') {
    const template = this.pathTemplates.get(templateId)
    if (!template) {
      throw new Error('Path template not found')
    }
    
    const personalizedPath = {
      id: this.generatePathId(),
      studentId,
      templateId,
      subject: template.subject,
      grade: template.grade,
      name: template.name,
      description: template.description,
      learningStyle,
      currentLevel,
      modules: this.adaptModulesForStudent(template.modules, learningStyle, currentLevel),
      currentModule: null,
      completedModules: new Set(),
      startDate: new Date(),
      estimatedCompletionDate: this.calculateEstimatedCompletion(template.modules),
      progress: 0,
      status: 'active'
    }
    
    // Set first available module as current
    personalizedPath.currentModule = personalizedPath.modules.find(m => 
      m.prerequisites.length === 0 || 
      m.prerequisites.every(prereq => personalizedPath.completedModules.has(prereq))
    )?.id
    
    this.learningPaths.set(personalizedPath.id, personalizedPath)
    
    console.log(`🎯 Personalized learning path created: ${personalizedPath.name}`)
    return personalizedPath
  }

  adaptModulesForStudent(modules, learningStyle, currentLevel) {
    return modules.map(module => {
      const adaptedModule = { ...module }
      
      // Adjust difficulty based on current level
      if (currentLevel === 'advanced' && module.difficulty === 'beginner') {
        adaptedModule.estimatedHours *= 0.7 // Reduce time for advanced students
      } else if (currentLevel === 'beginner' && module.difficulty === 'advanced') {
        adaptedModule.estimatedHours *= 1.3 // Increase time for beginners
      }
      
      // Add learning style specific recommendations
      adaptedModule.styleRecommendations = this.getStyleRecommendations(learningStyle, module)
      
      return adaptedModule
    })
  }

  getStyleRecommendations(learningStyle, module) {
    const recommendations = {
      visual: [
        'Use diagrams and visual aids',
        'Create mind maps for concepts',
        'Watch educational videos when available'
      ],
      auditory: [
        'Read concepts aloud',
        'Discuss with study groups',
        'Use verbal explanations'
      ],
      kinesthetic: [
        'Use hands-on activities',
        'Practice with real examples',
        'Take frequent breaks'
      ],
      reading_writing: [
        'Take detailed notes',
        'Write summaries',
        'Use textbooks extensively'
      ]
    }
    
    return recommendations[learningStyle] || recommendations.reading_writing
  }

  updateModuleProgress(pathId, moduleId, progressData) {
    const path = this.learningPaths.get(pathId)
    if (!path) return null
    
    if (!this.studentProgress.has(path.studentId)) {
      this.studentProgress.set(path.studentId, new Map())
    }
    
    const studentProgress = this.studentProgress.get(path.studentId)
    
    if (!studentProgress.has(pathId)) {
      studentProgress.set(pathId, new Map())
    }
    
    const pathProgress = studentProgress.get(pathId)
    
    const moduleProgress = {
      moduleId,
      progress: progressData.progress || 0,
      timeSpent: progressData.timeSpent || 0,
      conceptsMastered: new Set(progressData.conceptsMastered || []),
      assessmentScores: progressData.assessmentScores || [],
      lastActivity: new Date(),
      status: progressData.progress >= 100 ? 'completed' : 'in_progress'
    }
    
    pathProgress.set(moduleId, moduleProgress)
    
    // Update path progress
    this.updatePathProgress(path)
    
    // Check if module is completed
    if (moduleProgress.status === 'completed') {
      path.completedModules.add(moduleId)
      this.unlockNextModules(path)
    }
    
    console.log(`📈 Module progress updated: ${moduleId} - ${moduleProgress.progress}%`)
    return moduleProgress
  }

  updatePathProgress(path) {
    const studentProgress = this.studentProgress.get(path.studentId)
    if (!studentProgress) return
    
    const pathProgress = studentProgress.get(path.id)
    if (!pathProgress) return
    
    const totalModules = path.modules.length
    const completedModules = path.completedModules.size
    
    path.progress = (completedModules / totalModules) * 100
    
    if (path.progress >= 100) {
      path.status = 'completed'
      path.completedDate = new Date()
    }
  }

  unlockNextModules(path) {
    const availableModules = path.modules.filter(module => 
      !path.completedModules.has(module.id) &&
      module.prerequisites.every(prereq => path.completedModules.has(prereq))
    )
    
    if (availableModules.length > 0 && !path.currentModule) {
      path.currentModule = availableModules[0].id
    }
  }

  getRecommendations(studentId, pathId) {
    const path = this.learningPaths.get(pathId)
    if (!path || path.studentId !== studentId) return null
    
    const studentProgress = this.studentProgress.get(studentId)
    if (!studentProgress) return null
    
    const pathProgress = studentProgress.get(pathId)
    if (!pathProgress) return null
    
    const recommendations = []
    
    // Analyze weak areas
    const weakConcepts = this.identifyWeakConcepts(pathProgress)
    if (weakConcepts.length > 0) {
      recommendations.push({
        type: 'weakness',
        title: 'Focus on Weak Areas',
        description: `Review these concepts: ${weakConcepts.join(', ')}`,
        priority: 'high'
      })
    }
    
    // Suggest next steps
    const currentModule = path.modules.find(m => m.id === path.currentModule)
    if (currentModule) {
      recommendations.push({
        type: 'next_step',
        title: 'Continue Current Module',
        description: `Focus on "${currentModule.name}" - ${currentModule.description}`,
        priority: 'medium'
      })
    }
    
    // Learning style recommendations
    if (path.learningStyle) {
      const styleRecs = this.getStyleRecommendations(path.learningStyle, currentModule)
      recommendations.push({
        type: 'learning_style',
        title: 'Study Tips for Your Learning Style',
        description: styleRecs[0],
        priority: 'low'
      })
    }
    
    return recommendations
  }

  identifyWeakConcepts(pathProgress) {
    const weakConcepts = []
    
    for (const [moduleId, progress] of pathProgress) {
      if (progress.assessmentScores.length > 0) {
        const averageScore = progress.assessmentScores.reduce((sum, score) => sum + score, 0) / progress.assessmentScores.length
        if (averageScore < 70) { // Below 70% considered weak
          // Add concepts from this module to weak concepts
          const module = this.findModuleById(moduleId)
          if (module) {
            weakConcepts.push(...module.concepts)
          }
        }
      }
    }
    
    return [...new Set(weakConcepts)] // Remove duplicates
  }

  findModuleById(moduleId) {
    for (const [templateId, template] of this.pathTemplates) {
      const module = template.modules.find(m => m.id === moduleId)
      if (module) return module
    }
    return null
  }

  calculateEstimatedCompletion(modules) {
    const totalHours = modules.reduce((sum, module) => sum + module.estimatedHours, 0)
    const hoursPerWeek = 10 // Assume 10 hours of study per week
    const weeksToComplete = Math.ceil(totalHours / hoursPerWeek)
    
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + (weeksToComplete * 7))
    
    return completionDate
  }

  getStudentPaths(studentId) {
    const paths = []
    
    for (const [pathId, path] of this.learningPaths) {
      if (path.studentId === studentId) {
        paths.push(path)
      }
    }
    
    return paths.sort((a, b) => b.startDate - a.startDate)
  }

  generatePathId() {
    return 'path_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Concept Mapping Tools
 * Visual representation of knowledge connections
 */
export class ConceptMappingTools {
  constructor() {
    this.conceptMaps = new Map()
    this.concepts = new Map()
    this.relationships = new Map()
    this.templates = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    // Create concept map templates
    this.createTemplate('basic_map', {
      name: 'Basic Concept Map',
      description: 'Simple concept map with main topic and subtopics',
      structure: {
        centerConcept: true,
        maxLevels: 3,
        maxConceptsPerLevel: 6,
        relationshipTypes: ['is_a', 'part_of', 'causes', 'leads_to']
      }
    })
    
    this.createTemplate('hierarchical_map', {
      name: 'Hierarchical Map',
      description: 'Top-down hierarchical organization of concepts',
      structure: {
        centerConcept: true,
        maxLevels: 4,
        maxConceptsPerLevel: 4,
        relationshipTypes: ['is_a', 'includes', 'contains']
      }
    })
    
    console.log('🗺️ Concept Mapping Tools initialized')
  }

  createTemplate(templateId, templateData) {
    this.templates.set(templateId, {
      id: templateId,
      ...templateData,
      createdDate: new Date()
    })
  }

  createConceptMap(studentId, mapData) {
    const conceptMap = {
      id: this.generateMapId(),
      studentId,
      title: mapData.title,
      subject: mapData.subject,
      description: mapData.description || '',
      template: mapData.template || 'basic_map',
      centerConcept: mapData.centerConcept,
      concepts: new Map(),
      relationships: [],
      createdDate: new Date(),
      lastModified: new Date(),
      isPublic: mapData.isPublic || false,
      collaborators: mapData.collaborators || []
    }
    
    // Add center concept
    if (conceptMap.centerConcept) {
      this.addConcept(conceptMap.id, {
        text: conceptMap.centerConcept,
        type: 'center',
        position: { x: 0, y: 0 },
        level: 0
      })
    }
    
    this.conceptMaps.set(conceptMap.id, conceptMap)
    
    console.log(`🗺️ Concept map "${conceptMap.title}" created`)
    return conceptMap
  }

  addConcept(mapId, conceptData) {
    const map = this.conceptMaps.get(mapId)
    if (!map) {
      throw new Error('Concept map not found')
    }
    
    const concept = {
      id: this.generateConceptId(),
      text: conceptData.text,
      type: conceptData.type || 'concept', // center, concept, example
      position: conceptData.position || { x: 0, y: 0 },
      level: conceptData.level || 1,
      color: conceptData.color || '#3B82F6',
      size: conceptData.size || 'medium',
      notes: conceptData.notes || '',
      createdDate: new Date()
    }
    
    map.concepts.set(concept.id, concept)
    map.lastModified = new Date()
    
    console.log(`📍 Concept "${concept.text}" added to map "${map.title}"`)
    return concept
  }

  addRelationship(mapId, relationshipData) {
    const map = this.conceptMaps.get(mapId)
    if (!map) {
      throw new Error('Concept map not found')
    }
    
    const relationship = {
      id: this.generateRelationshipId(),
      fromConceptId: relationshipData.fromConceptId,
      toConceptId: relationshipData.toConceptId,
      type: relationshipData.type || 'relates_to',
      label: relationshipData.label || '',
      strength: relationshipData.strength || 'medium', // weak, medium, strong
      direction: relationshipData.direction || 'bidirectional', // unidirectional, bidirectional
      createdDate: new Date()
    }
    
    map.relationships.push(relationship)
    map.lastModified = new Date()
    
    console.log(`🔗 Relationship added: ${relationship.type}`)
    return relationship
  }

  generateMapSuggestions(mapId, subject) {
    const map = this.conceptMaps.get(mapId)
    if (!map) return []
    
    const suggestions = []
    
    // Suggest related concepts based on subject
    const subjectConcepts = this.getSubjectConcepts(subject)
    const existingConcepts = Array.from(map.concepts.values()).map(c => c.text.toLowerCase())
    
    subjectConcepts.forEach(concept => {
      if (!existingConcepts.includes(concept.toLowerCase())) {
        suggestions.push({
          type: 'concept',
          text: concept,
          reason: 'Related to subject',
          priority: 'medium'
        })
      }
    })
    
    // Suggest relationships
    const concepts = Array.from(map.concepts.values())
    concepts.forEach(concept => {
      const relatedConcepts = this.findRelatedConcepts(concept.text, subject)
      relatedConcepts.forEach(related => {
        if (!existingConcepts.includes(related.concept.toLowerCase())) {
          suggestions.push({
            type: 'relationship',
            fromConcept: concept.text,
            toConcept: related.concept,
            relationshipType: related.relationship,
            reason: 'Commonly related concepts',
            priority: 'low'
          })
        }
      })
    })
    
    return suggestions.slice(0, 10) // Limit to 10 suggestions
  }

  getSubjectConcepts(subject) {
    const conceptsBySubject = {
      mathematics: [
        'Numbers', 'Algebra', 'Geometry', 'Statistics', 'Equations', 'Functions',
        'Fractions', 'Decimals', 'Percentages', 'Angles', 'Area', 'Volume'
      ],
      science: [
        'Matter', 'Energy', 'Force', 'Motion', 'Atoms', 'Molecules',
        'Chemical Reactions', 'Photosynthesis', 'Ecosystem', 'Gravity'
      ],
      english: [
        'Grammar', 'Vocabulary', 'Literature', 'Writing', 'Reading',
        'Poetry', 'Prose', 'Characters', 'Plot', 'Theme'
      ],
      history: [
        'Timeline', 'Civilization', 'Culture', 'Government', 'Economy',
        'War', 'Peace', 'Leaders', 'Events', 'Causes', 'Effects'
      ]
    }
    
    return conceptsBySubject[subject] || []
  }

  findRelatedConcepts(conceptText, subject) {
    // Simplified relationship suggestions
    const relationships = {
      'Numbers': [
        { concept: 'Fractions', relationship: 'includes' },
        { concept: 'Decimals', relationship: 'includes' },
        { concept: 'Integers', relationship: 'includes' }
      ],
      'Geometry': [
        { concept: 'Shapes', relationship: 'studies' },
        { concept: 'Angles', relationship: 'measures' },
        { concept: 'Area', relationship: 'calculates' }
      ],
      'Photosynthesis': [
        { concept: 'Plants', relationship: 'occurs_in' },
        { concept: 'Sunlight', relationship: 'requires' },
        { concept: 'Oxygen', relationship: 'produces' }
      ]
    }
    
    return relationships[conceptText] || []
  }

  exportMap(mapId, format = 'json') {
    const map = this.conceptMaps.get(mapId)
    if (!map) return null
    
    const exportData = {
      title: map.title,
      subject: map.subject,
      description: map.description,
      concepts: Array.from(map.concepts.values()),
      relationships: map.relationships,
      createdDate: map.createdDate,
      lastModified: map.lastModified
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2)
      case 'text':
        return this.convertToText(exportData)
      default:
        return exportData
    }
  }

  convertToText(mapData) {
    let text = `Concept Map: ${mapData.title}\n`
    text += `Subject: ${mapData.subject}\n`
    text += `Description: ${mapData.description}\n\n`
    
    text += 'Concepts:\n'
    mapData.concepts.forEach(concept => {
      text += `- ${concept.text} (${concept.type})\n`
    })
    
    text += '\nRelationships:\n'
    mapData.relationships.forEach(rel => {
      const fromConcept = mapData.concepts.find(c => c.id === rel.fromConceptId)
      const toConcept = mapData.concepts.find(c => c.id === rel.toConceptId)
      text += `- ${fromConcept?.text} ${rel.type} ${toConcept?.text}\n`
    })
    
    return text
  }

  getStudentMaps(studentId) {
    const maps = []
    
    for (const [mapId, map] of this.conceptMaps) {
      if (map.studentId === studentId) {
        maps.push({
          id: map.id,
          title: map.title,
          subject: map.subject,
          conceptCount: map.concepts.size,
          relationshipCount: map.relationships.length,
          lastModified: map.lastModified
        })
      }
    }
    
    return maps.sort((a, b) => b.lastModified - a.lastModified)
  }

  generateMapId() {
    return 'map_' + Math.random().toString(36).substr(2, 9)
  }

  generateConceptId() {
    return 'concept_' + Math.random().toString(36).substr(2, 9)
  }

  generateRelationshipId() {
    return 'rel_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Flashcard Creator System
 * Create, organize, and study with digital flashcards
 */
export class FlashcardCreator {
  constructor() {
    this.flashcardSets = new Map()
    this.flashcards = new Map()
    this.studySessions = new Map()
    this.spacedRepetition = new Map()

    this.initializeSystem()
  }

  initializeSystem() {
    console.log('🃏 Flashcard Creator System initialized')
  }

  createFlashcardSet(studentId, setData) {
    const flashcardSet = {
      id: this.generateSetId(),
      studentId,
      title: setData.title,
      subject: setData.subject,
      description: setData.description || '',
      tags: new Set(setData.tags || []),
      difficulty: setData.difficulty || 'medium',
      isPublic: setData.isPublic || false,
      createdDate: new Date(),
      lastModified: new Date(),
      cardCount: 0,
      studyCount: 0,
      averageScore: 0
    }

    this.flashcardSets.set(flashcardSet.id, flashcardSet)

    console.log(`🃏 Flashcard set "${flashcardSet.title}" created`)
    return flashcardSet
  }

  addFlashcard(setId, cardData) {
    const set = this.flashcardSets.get(setId)
    if (!set) {
      throw new Error('Flashcard set not found')
    }

    const flashcard = {
      id: this.generateCardId(),
      setId,
      front: cardData.front,
      back: cardData.back,
      type: cardData.type || 'text', // text, image, audio
      difficulty: cardData.difficulty || set.difficulty,
      tags: new Set(cardData.tags || []),
      createdDate: new Date(),
      lastReviewed: null,
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      easeFactor: 2.5, // For spaced repetition
      interval: 1, // Days until next review
      nextReview: new Date()
    }

    this.flashcards.set(flashcard.id, flashcard)

    // Update set
    set.cardCount++
    set.lastModified = new Date()

    console.log(`🃏 Flashcard added to set "${set.title}"`)
    return flashcard
  }

  startStudySession(studentId, setId, sessionType = 'review') {
    const set = this.flashcardSets.get(setId)
    if (!set || set.studentId !== studentId) {
      throw new Error('Flashcard set not found or access denied')
    }

    const cards = this.getSetCards(setId)
    let studyCards = []

    switch (sessionType) {
      case 'review':
        studyCards = cards.filter(card => card.nextReview <= new Date())
        break
      case 'new':
        studyCards = cards.filter(card => card.reviewCount === 0)
        break
      case 'difficult':
        studyCards = cards.filter(card => card.correctCount < card.incorrectCount)
        break
      case 'all':
      default:
        studyCards = cards
    }

    // Shuffle cards
    studyCards = this.shuffleArray([...studyCards])

    const session = {
      id: this.generateSessionId(),
      studentId,
      setId,
      sessionType,
      cards: studyCards.map(card => card.id),
      currentCardIndex: 0,
      startTime: new Date(),
      endTime: null,
      responses: [],
      score: 0,
      status: 'active'
    }

    this.studySessions.set(session.id, session)

    console.log(`🎯 Study session started: ${studyCards.length} cards`)
    return session
  }

  answerCard(sessionId, cardId, isCorrect, responseTime = null) {
    const session = this.studySessions.get(sessionId)
    if (!session || session.status !== 'active') {
      throw new Error('Study session not found or not active')
    }

    const card = this.flashcards.get(cardId)
    if (!card) {
      throw new Error('Flashcard not found')
    }

    const response = {
      cardId,
      isCorrect,
      responseTime,
      timestamp: new Date()
    }

    session.responses.push(response)

    // Update card statistics
    card.reviewCount++
    card.lastReviewed = new Date()

    if (isCorrect) {
      card.correctCount++
      session.score++

      // Update spaced repetition
      this.updateSpacedRepetition(card, true)
    } else {
      card.incorrectCount++

      // Update spaced repetition
      this.updateSpacedRepetition(card, false)
    }

    // Move to next card
    session.currentCardIndex++

    // Check if session is complete
    if (session.currentCardIndex >= session.cards.length) {
      this.completeStudySession(session)
    }

    console.log(`📝 Card answered: ${isCorrect ? 'Correct' : 'Incorrect'}`)
    return response
  }

  updateSpacedRepetition(card, isCorrect) {
    if (isCorrect) {
      if (card.reviewCount === 1) {
        card.interval = 1
      } else if (card.reviewCount === 2) {
        card.interval = 6
      } else {
        card.interval = Math.round(card.interval * card.easeFactor)
      }

      card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)))
    } else {
      card.interval = 1
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2)
    }

    // Set next review date
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + card.interval)
    card.nextReview = nextReview
  }

  completeStudySession(session) {
    session.endTime = new Date()
    session.status = 'completed'

    const totalCards = session.cards.length
    const correctAnswers = session.responses.filter(r => r.isCorrect).length
    session.finalScore = totalCards > 0 ? (correctAnswers / totalCards) * 100 : 0

    // Update set statistics
    const set = this.flashcardSets.get(session.setId)
    if (set) {
      set.studyCount++

      // Update average score
      const allSessions = Array.from(this.studySessions.values())
        .filter(s => s.setId === session.setId && s.status === 'completed')

      if (allSessions.length > 0) {
        set.averageScore = allSessions.reduce((sum, s) => sum + s.finalScore, 0) / allSessions.length
      }
    }

    console.log(`✅ Study session completed: ${session.finalScore.toFixed(1)}%`)
    return session
  }

  getSetCards(setId) {
    const cards = []

    for (const [cardId, card] of this.flashcards) {
      if (card.setId === setId) {
        cards.push(card)
      }
    }

    return cards
  }

  getStudentSets(studentId) {
    const sets = []

    for (const [setId, set] of this.flashcardSets) {
      if (set.studentId === studentId) {
        sets.push(set)
      }
    }

    return sets.sort((a, b) => b.lastModified - a.lastModified)
  }

  getStudyStatistics(studentId, setId = null) {
    let sessions = Array.from(this.studySessions.values())
      .filter(s => s.studentId === studentId && s.status === 'completed')

    if (setId) {
      sessions = sessions.filter(s => s.setId === setId)
    }

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        totalTimeStudied: 0,
        cardsReviewed: 0,
        improvementTrend: 'no_data'
      }
    }

    const totalSessions = sessions.length
    const averageScore = sessions.reduce((sum, s) => sum + s.finalScore, 0) / totalSessions
    const totalTimeStudied = sessions.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
    const cardsReviewed = sessions.reduce((sum, s) => sum + s.cards.length, 0)

    // Calculate improvement trend
    const recentSessions = sessions.slice(-5)
    const olderSessions = sessions.slice(0, -5)

    let improvementTrend = 'stable'
    if (recentSessions.length >= 3 && olderSessions.length >= 3) {
      const recentAverage = recentSessions.reduce((sum, s) => sum + s.finalScore, 0) / recentSessions.length
      const olderAverage = olderSessions.reduce((sum, s) => sum + s.finalScore, 0) / olderSessions.length

      if (recentAverage > olderAverage + 5) {
        improvementTrend = 'improving'
      } else if (recentAverage < olderAverage - 5) {
        improvementTrend = 'declining'
      }
    }

    return {
      totalSessions,
      averageScore,
      totalTimeStudied,
      cardsReviewed,
      improvementTrend
    }
  }

  shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  generateSetId() {
    return 'set_' + Math.random().toString(36).substr(2, 9)
  }

  generateCardId() {
    return 'card_' + Math.random().toString(36).substr(2, 9)
  }

  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Practice Test Generator
 * Generate practice tests and quizzes for assessment
 */
export class PracticeTestGenerator {
  constructor() {
    this.testTemplates = new Map()
    this.questionBank = new Map()
    this.generatedTests = new Map()
    this.testResults = new Map()

    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize question bank with sample questions
    this.initializeQuestionBank()

    // Create test templates
    this.createTestTemplate('quick_quiz', {
      name: 'Quick Quiz',
      description: '5-10 questions for quick assessment',
      questionCount: { min: 5, max: 10 },
      timeLimit: 15, // minutes
      questionTypes: ['multiple_choice', 'true_false'],
      difficulty: 'mixed'
    })

    this.createTestTemplate('chapter_test', {
      name: 'Chapter Test',
      description: 'Comprehensive test covering a chapter',
      questionCount: { min: 15, max: 25 },
      timeLimit: 45,
      questionTypes: ['multiple_choice', 'true_false', 'short_answer'],
      difficulty: 'mixed'
    })

    this.createTestTemplate('practice_exam', {
      name: 'Practice Exam',
      description: 'Full practice exam simulation',
      questionCount: { min: 30, max: 50 },
      timeLimit: 90,
      questionTypes: ['multiple_choice', 'true_false', 'short_answer', 'essay'],
      difficulty: 'mixed'
    })

    console.log('📝 Practice Test Generator initialized')
  }

  initializeQuestionBank() {
    // Questions should be loaded from database/API in production
    // TODO: Load question bank from database
  }

  addQuestionToBank(subject, questionData) {
    if (!this.questionBank.has(subject)) {
      this.questionBank.set(subject, [])
    }

    this.questionBank.get(subject).push({
      ...questionData,
      addedDate: new Date()
    })
  }

  createTestTemplate(templateId, templateData) {
    this.testTemplates.set(templateId, {
      id: templateId,
      ...templateData,
      createdDate: new Date()
    })
  }

  generateTest(studentId, testConfig) {
    const template = this.testTemplates.get(testConfig.template)
    if (!template) {
      throw new Error('Test template not found')
    }

    const questions = this.selectQuestions(testConfig)

    const test = {
      id: this.generateTestId(),
      studentId,
      title: testConfig.title || template.name,
      subject: testConfig.subject,
      template: testConfig.template,
      questions: questions,
      timeLimit: testConfig.timeLimit || template.timeLimit,
      createdDate: new Date(),
      status: 'ready',
      attempts: []
    }

    this.generatedTests.set(test.id, test)

    console.log(`📝 Test "${test.title}" generated with ${questions.length} questions`)
    return test
  }

  selectQuestions(testConfig) {
    const subject = testConfig.subject
    const template = this.testTemplates.get(testConfig.template)

    if (!this.questionBank.has(subject)) {
      throw new Error(`No questions available for subject: ${subject}`)
    }

    const availableQuestions = this.questionBank.get(subject)
    let selectedQuestions = []

    // Filter by topics if specified
    let filteredQuestions = availableQuestions
    if (testConfig.topics && testConfig.topics.length > 0) {
      filteredQuestions = availableQuestions.filter(q =>
        testConfig.topics.includes(q.topic)
      )
    }

    // Filter by difficulty if specified
    if (testConfig.difficulty && testConfig.difficulty !== 'mixed') {
      filteredQuestions = filteredQuestions.filter(q =>
        q.difficulty === testConfig.difficulty
      )
    }

    // Filter by question types
    if (template.questionTypes && template.questionTypes.length > 0) {
      filteredQuestions = filteredQuestions.filter(q =>
        template.questionTypes.includes(q.type)
      )
    }

    // Determine number of questions
    const questionCount = testConfig.questionCount ||
      Math.floor((template.questionCount.min + template.questionCount.max) / 2)

    // Select questions
    if (filteredQuestions.length <= questionCount) {
      selectedQuestions = [...filteredQuestions]
    } else {
      // Randomly select questions
      const shuffled = this.shuffleArray(filteredQuestions)
      selectedQuestions = shuffled.slice(0, questionCount)
    }

    // Shuffle the selected questions
    return this.shuffleArray(selectedQuestions).map((question, index) => ({
      ...question,
      questionNumber: index + 1
    }))
  }

  startTest(testId, studentId) {
    const test = this.generatedTests.get(testId)
    if (!test || test.studentId !== studentId) {
      throw new Error('Test not found or access denied')
    }

    const attempt = {
      id: this.generateAttemptId(),
      testId,
      studentId,
      startTime: new Date(),
      endTime: null,
      answers: new Map(),
      currentQuestion: 0,
      status: 'in_progress',
      timeRemaining: test.timeLimit * 60 // Convert to seconds
    }

    test.attempts.push(attempt)
    test.status = 'in_progress'

    console.log(`🎯 Test started: ${test.title}`)
    return attempt
  }

  submitAnswer(testId, attemptId, questionNumber, answer) {
    const test = this.generatedTests.get(testId)
    if (!test) {
      throw new Error('Test not found')
    }

    const attempt = test.attempts.find(a => a.id === attemptId)
    if (!attempt || attempt.status !== 'in_progress') {
      throw new Error('Test attempt not found or not in progress')
    }

    attempt.answers.set(questionNumber, {
      answer,
      timestamp: new Date()
    })

    console.log(`📝 Answer submitted for question ${questionNumber}`)
    return true
  }

  submitTest(testId, attemptId) {
    const test = this.generatedTests.get(testId)
    if (!test) {
      throw new Error('Test not found')
    }

    const attempt = test.attempts.find(a => a.id === attemptId)
    if (!attempt || attempt.status !== 'in_progress') {
      throw new Error('Test attempt not found or not in progress')
    }

    attempt.endTime = new Date()
    attempt.status = 'completed'
    test.status = 'completed'

    // Calculate score
    const results = this.calculateTestScore(test, attempt)

    // Store results
    this.testResults.set(attempt.id, results)

    console.log(`✅ Test submitted: ${results.score}%`)
    return results
  }

  calculateTestScore(test, attempt) {
    let correctAnswers = 0
    let totalQuestions = test.questions.length
    const questionResults = []

    test.questions.forEach(question => {
      const studentAnswer = attempt.answers.get(question.questionNumber)
      let isCorrect = false

      if (studentAnswer) {
        switch (question.type) {
          case 'multiple_choice':
            isCorrect = studentAnswer.answer === question.correctAnswer
            break
          case 'true_false':
            isCorrect = studentAnswer.answer === question.correctAnswer
            break
          case 'short_answer':
            // Simple text comparison (could be enhanced with fuzzy matching)
            isCorrect = studentAnswer.answer.toLowerCase().trim() ===
                       question.correctAnswer.toLowerCase().trim()
            break
          default:
            isCorrect = false
        }
      }

      if (isCorrect) correctAnswers++

      questionResults.push({
        questionNumber: question.questionNumber,
        question: question.question,
        studentAnswer: studentAnswer?.answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation
      })
    })

    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    const timeTaken = attempt.endTime - attempt.startTime

    return {
      attemptId: attempt.id,
      testId: test.id,
      score,
      correctAnswers,
      totalQuestions,
      timeTaken,
      questionResults,
      completedDate: attempt.endTime
    }
  }

  getTestHistory(studentId) {
    const history = []

    for (const [testId, test] of this.generatedTests) {
      if (test.studentId === studentId) {
        const completedAttempts = test.attempts.filter(a => a.status === 'completed')

        completedAttempts.forEach(attempt => {
          const results = this.testResults.get(attempt.id)
          if (results) {
            history.push({
              testId: test.id,
              title: test.title,
              subject: test.subject,
              score: results.score,
              completedDate: results.completedDate,
              timeTaken: results.timeTaken,
              questionCount: results.totalQuestions
            })
          }
        })
      }
    }

    return history.sort((a, b) => b.completedDate - a.completedDate)
  }

  getSubjectAnalytics(studentId, subject) {
    const subjectTests = this.getTestHistory(studentId)
      .filter(test => test.subject === subject)

    if (subjectTests.length === 0) {
      return {
        averageScore: 0,
        testCount: 0,
        improvementTrend: 'no_data',
        weakTopics: [],
        strongTopics: []
      }
    }

    const averageScore = subjectTests.reduce((sum, test) => sum + test.score, 0) / subjectTests.length
    const testCount = subjectTests.length

    // Calculate improvement trend
    let improvementTrend = 'stable'
    if (subjectTests.length >= 4) {
      const recent = subjectTests.slice(0, 2)
      const older = subjectTests.slice(-2)

      const recentAvg = recent.reduce((sum, test) => sum + test.score, 0) / recent.length
      const olderAvg = older.reduce((sum, test) => sum + test.score, 0) / older.length

      if (recentAvg > olderAvg + 5) {
        improvementTrend = 'improving'
      } else if (recentAvg < olderAvg - 5) {
        improvementTrend = 'declining'
      }
    }

    return {
      averageScore,
      testCount,
      improvementTrend,
      weakTopics: [], // Would need more detailed topic tracking
      strongTopics: []
    }
  }

  shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  generateTestId() {
    return 'test_' + Math.random().toString(36).substr(2, 9)
  }

  generateAttemptId() {
    return 'attempt_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Learning Analytics Dashboard
 * Comprehensive analytics for student learning patterns and progress
 */
export class LearningAnalyticsDashboard {
  constructor() {
    this.studentData = new Map()
    this.learningMetrics = new Map()
    this.performanceAnalytics = new Map()
    this.recommendations = new Map()

    this.initializeSystem()
  }

  initializeSystem() {
    console.log('📊 Learning Analytics Dashboard initialized')
  }

  trackLearningActivity(studentId, activityData) {
    if (!this.studentData.has(studentId)) {
      this.studentData.set(studentId, {
        activities: [],
        sessions: [],
        assessments: [],
        goals: [],
        preferences: {}
      })
    }

    const studentRecord = this.studentData.get(studentId)

    const activity = {
      id: this.generateActivityId(),
      type: activityData.type, // study, assessment, reading, practice
      subject: activityData.subject,
      topic: activityData.topic,
      duration: activityData.duration,
      performance: activityData.performance,
      difficulty: activityData.difficulty,
      timestamp: new Date(),
      metadata: activityData.metadata || {}
    }

    studentRecord.activities.push(activity)

    // Update learning metrics
    this.updateLearningMetrics(studentId, activity)

    console.log(`📊 Learning activity tracked: ${activity.type} - ${activity.subject}`)
    return activity
  }

  updateLearningMetrics(studentId, activity) {
    if (!this.learningMetrics.has(studentId)) {
      this.learningMetrics.set(studentId, {
        totalStudyTime: 0,
        subjectBreakdown: new Map(),
        difficultyProgress: new Map(),
        learningVelocity: 0,
        consistencyScore: 0,
        retentionRate: 0,
        lastUpdated: new Date()
      })
    }

    const metrics = this.learningMetrics.get(studentId)

    // Update total study time
    metrics.totalStudyTime += activity.duration || 0

    // Update subject breakdown
    if (!metrics.subjectBreakdown.has(activity.subject)) {
      metrics.subjectBreakdown.set(activity.subject, {
        totalTime: 0,
        sessionCount: 0,
        averagePerformance: 0,
        topicsCovered: new Set()
      })
    }

    const subjectMetrics = metrics.subjectBreakdown.get(activity.subject)
    subjectMetrics.totalTime += activity.duration || 0
    subjectMetrics.sessionCount++
    subjectMetrics.topicsCovered.add(activity.topic)

    if (activity.performance !== undefined) {
      subjectMetrics.averagePerformance =
        (subjectMetrics.averagePerformance * (subjectMetrics.sessionCount - 1) + activity.performance) /
        subjectMetrics.sessionCount
    }

    // Update difficulty progress
    if (activity.difficulty) {
      if (!metrics.difficultyProgress.has(activity.difficulty)) {
        metrics.difficultyProgress.set(activity.difficulty, {
          attempts: 0,
          successes: 0,
          averageTime: 0
        })
      }

      const difficultyMetrics = metrics.difficultyProgress.get(activity.difficulty)
      difficultyMetrics.attempts++

      if (activity.performance && activity.performance >= 70) {
        difficultyMetrics.successes++
      }

      if (activity.duration) {
        difficultyMetrics.averageTime =
          (difficultyMetrics.averageTime * (difficultyMetrics.attempts - 1) + activity.duration) /
          difficultyMetrics.attempts
      }
    }

    metrics.lastUpdated = new Date()

    // Calculate derived metrics
    this.calculateDerivedMetrics(studentId)
  }

  calculateDerivedMetrics(studentId) {
    const studentRecord = this.studentData.get(studentId)
    const metrics = this.learningMetrics.get(studentId)

    if (!studentRecord || !metrics) return

    // Calculate learning velocity (topics covered per hour)
    const totalTopics = Array.from(metrics.subjectBreakdown.values())
      .reduce((sum, subject) => sum + subject.topicsCovered.size, 0)

    metrics.learningVelocity = metrics.totalStudyTime > 0 ?
      totalTopics / (metrics.totalStudyTime / 60) : 0 // topics per hour

    // Calculate consistency score (based on regular study patterns)
    metrics.consistencyScore = this.calculateConsistencyScore(studentRecord.activities)

    // Calculate retention rate (based on repeated assessments)
    metrics.retentionRate = this.calculateRetentionRate(studentRecord.activities)
  }

  calculateConsistencyScore(activities) {
    if (activities.length < 7) return 0

    // Group activities by day
    const dailyActivities = new Map()
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    activities
      .filter(activity => activity.timestamp >= last30Days)
      .forEach(activity => {
        const day = activity.timestamp.toDateString()
        if (!dailyActivities.has(day)) {
          dailyActivities.set(day, 0)
        }
        dailyActivities.set(day, dailyActivities.get(day) + 1)
      })

    const activeDays = dailyActivities.size
    const totalDays = Math.min(30, Math.ceil((new Date() - last30Days) / (24 * 60 * 60 * 1000)))

    return (activeDays / totalDays) * 100
  }

  calculateRetentionRate(activities) {
    // Simplified retention calculation based on assessment performance over time
    const assessments = activities
      .filter(activity => activity.type === 'assessment' && activity.performance !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (assessments.length < 3) return 0

    const recentAssessments = assessments.slice(-5)
    const olderAssessments = assessments.slice(0, -5)

    if (olderAssessments.length === 0) return 0

    const recentAverage = recentAssessments.reduce((sum, a) => sum + a.performance, 0) / recentAssessments.length
    const olderAverage = olderAssessments.reduce((sum, a) => sum + a.performance, 0) / olderAssessments.length

    return Math.max(0, Math.min(100, (recentAverage / olderAverage) * 100))
  }

  generateLearningReport(studentId, timeframe = 'month') {
    const studentRecord = this.studentData.get(studentId)
    const metrics = this.learningMetrics.get(studentId)

    if (!studentRecord || !metrics) {
      return {
        error: 'No learning data available for this student'
      }
    }

    // Filter activities by timeframe
    let startDate
    switch (timeframe) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0) // All time
    }

    const filteredActivities = studentRecord.activities
      .filter(activity => activity.timestamp >= startDate)

    // Generate report
    const report = {
      timeframe,
      period: {
        start: startDate,
        end: new Date()
      },
      overview: {
        totalStudyTime: this.formatDuration(metrics.totalStudyTime),
        totalSessions: filteredActivities.length,
        averageSessionLength: filteredActivities.length > 0 ?
          this.formatDuration(metrics.totalStudyTime / filteredActivities.length) : '0 min',
        consistencyScore: metrics.consistencyScore.toFixed(1),
        learningVelocity: metrics.learningVelocity.toFixed(2)
      },
      subjectBreakdown: this.generateSubjectBreakdown(metrics.subjectBreakdown),
      performanceTrends: this.generatePerformanceTrends(filteredActivities),
      strengths: this.identifyStrengths(studentId),
      weaknesses: this.identifyWeaknesses(studentId),
      recommendations: this.generateRecommendations(studentId)
    }

    return report
  }

  generateSubjectBreakdown(subjectBreakdown) {
    const breakdown = []

    for (const [subject, metrics] of subjectBreakdown) {
      breakdown.push({
        subject,
        timeSpent: this.formatDuration(metrics.totalTime),
        sessionCount: metrics.sessionCount,
        averagePerformance: metrics.averagePerformance.toFixed(1),
        topicsCovered: metrics.topicsCovered.size,
        timePercentage: 0 // Will be calculated after all subjects are processed
      })
    }

    // Calculate time percentages
    const totalTime = breakdown.reduce((sum, item) => sum + item.timeSpent, 0)
    breakdown.forEach(item => {
      item.timePercentage = totalTime > 0 ? ((item.timeSpent / totalTime) * 100).toFixed(1) : 0
    })

    return breakdown.sort((a, b) => b.timeSpent - a.timeSpent)
  }

  generatePerformanceTrends(activities) {
    const assessments = activities
      .filter(activity => activity.type === 'assessment' && activity.performance !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (assessments.length < 2) {
      return {
        trend: 'insufficient_data',
        dataPoints: []
      }
    }

    const dataPoints = assessments.map(assessment => ({
      date: assessment.timestamp,
      performance: assessment.performance,
      subject: assessment.subject
    }))

    // Calculate trend
    const firstHalf = assessments.slice(0, Math.floor(assessments.length / 2))
    const secondHalf = assessments.slice(Math.floor(assessments.length / 2))

    const firstAverage = firstHalf.reduce((sum, a) => sum + a.performance, 0) / firstHalf.length
    const secondAverage = secondHalf.reduce((sum, a) => sum + a.performance, 0) / secondHalf.length

    let trend = 'stable'
    if (secondAverage > firstAverage + 5) {
      trend = 'improving'
    } else if (secondAverage < firstAverage - 5) {
      trend = 'declining'
    }

    return {
      trend,
      dataPoints,
      improvement: secondAverage - firstAverage
    }
  }

  identifyStrengths(studentId) {
    const metrics = this.learningMetrics.get(studentId)
    if (!metrics) return []

    const strengths = []

    // High consistency
    if (metrics.consistencyScore > 80) {
      strengths.push({
        type: 'consistency',
        description: 'Excellent study consistency',
        score: metrics.consistencyScore
      })
    }

    // High retention
    if (metrics.retentionRate > 85) {
      strengths.push({
        type: 'retention',
        description: 'Strong knowledge retention',
        score: metrics.retentionRate
      })
    }

    // Strong subjects
    for (const [subject, subjectMetrics] of metrics.subjectBreakdown) {
      if (subjectMetrics.averagePerformance > 85) {
        strengths.push({
          type: 'subject_mastery',
          description: `Excellent performance in ${subject}`,
          subject,
          score: subjectMetrics.averagePerformance
        })
      }
    }

    return strengths
  }

  identifyWeaknesses(studentId) {
    const metrics = this.learningMetrics.get(studentId)
    if (!metrics) return []

    const weaknesses = []

    // Low consistency
    if (metrics.consistencyScore < 50) {
      weaknesses.push({
        type: 'consistency',
        description: 'Inconsistent study patterns',
        score: metrics.consistencyScore,
        suggestion: 'Try to establish a regular study schedule'
      })
    }

    // Low retention
    if (metrics.retentionRate < 60) {
      weaknesses.push({
        type: 'retention',
        description: 'Knowledge retention needs improvement',
        score: metrics.retentionRate,
        suggestion: 'Use spaced repetition and regular review'
      })
    }

    // Weak subjects
    for (const [subject, subjectMetrics] of metrics.subjectBreakdown) {
      if (subjectMetrics.averagePerformance < 60) {
        weaknesses.push({
          type: 'subject_difficulty',
          description: `Struggling with ${subject}`,
          subject,
          score: subjectMetrics.averagePerformance,
          suggestion: `Focus more time on ${subject} fundamentals`
        })
      }
    }

    return weaknesses
  }

  generateRecommendations(studentId) {
    const strengths = this.identifyStrengths(studentId)
    const weaknesses = this.identifyWeaknesses(studentId)
    const metrics = this.learningMetrics.get(studentId)

    const recommendations = []

    // Based on weaknesses
    weaknesses.forEach(weakness => {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        title: `Improve ${weakness.type}`,
        description: weakness.suggestion,
        actionItems: this.getActionItems(weakness.type)
      })
    })

    // Based on learning patterns
    if (metrics && metrics.learningVelocity < 1) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        title: 'Increase Learning Efficiency',
        description: 'Your learning pace could be improved',
        actionItems: [
          'Use active learning techniques',
          'Take regular breaks',
          'Focus on understanding rather than memorization'
        ]
      })
    }

    // Leverage strengths
    strengths.forEach(strength => {
      if (strength.type === 'subject_mastery') {
        recommendations.push({
          type: 'leverage',
          priority: 'low',
          title: `Leverage ${strength.subject} Skills`,
          description: `Use your strong ${strength.subject} skills to help with other subjects`,
          actionItems: [
            `Tutor classmates in ${strength.subject}`,
            'Look for connections between subjects',
            'Build confidence through continued success'
          ]
        })
      }
    })

    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }

  getActionItems(weaknessType) {
    const actionItemsMap = {
      consistency: [
        'Set a fixed study schedule',
        'Use a study planner or calendar',
        'Start with short, manageable sessions',
        'Track your daily study habits'
      ],
      retention: [
        'Review material within 24 hours',
        'Use spaced repetition techniques',
        'Create summaries and mind maps',
        'Test yourself regularly'
      ],
      subject_difficulty: [
        'Identify specific problem areas',
        'Seek help from teachers or peers',
        'Use additional practice materials',
        'Break complex topics into smaller parts'
      ]
    }

    return actionItemsMap[weaknessType] || []
  }

  formatDuration(minutes) {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = Math.round(minutes % 60)
      return `${hours}h ${remainingMinutes}m`
    }
  }

  generateActivityId() {
    return 'activity_' + Math.random().toString(36).substr(2, 9)
  }
}
