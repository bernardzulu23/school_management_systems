/**
 * Digital Notebook and Research Project Management System
 * Cross-subject note-taking and project management for students
 * Optimized for offline use in rural Zambian schools
 */

/**
 * Digital Notebook System
 * Cross-subject note-taking with organization and search
 */
export class DigitalNotebookSystem {
  constructor() {
    this.notebooks = new Map()
    this.notes = new Map()
    this.tags = new Map()
    this.templates = new Map()
    this.searchIndex = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    // Create default note templates
    this.createTemplate('lecture_notes', {
      name: 'Lecture Notes',
      description: 'Template for class lecture notes',
      sections: [
        { name: 'Date & Subject', type: 'header' },
        { name: 'Key Topics', type: 'list' },
        { name: 'Main Content', type: 'text' },
        { name: 'Questions', type: 'list' },
        { name: 'Summary', type: 'text' }
      ]
    })
    
    this.createTemplate('study_notes', {
      name: 'Study Notes',
      description: 'Template for personal study notes',
      sections: [
        { name: 'Topic', type: 'header' },
        { name: 'What I Know', type: 'text' },
        { name: 'What I Need to Learn', type: 'list' },
        { name: 'Key Concepts', type: 'text' },
        { name: 'Practice Problems', type: 'text' }
      ]
    })
    
    this.createTemplate('experiment_log', {
      name: 'Experiment Log',
      description: 'Template for science experiments',
      sections: [
        { name: 'Experiment Title', type: 'header' },
        { name: 'Hypothesis', type: 'text' },
        { name: 'Materials', type: 'list' },
        { name: 'Procedure', type: 'numbered_list' },
        { name: 'Observations', type: 'text' },
        { name: 'Results', type: 'text' },
        { name: 'Conclusion', type: 'text' }
      ]
    })
    
    console.log('📓 Digital Notebook System initialized')
  }

  createNotebook(studentId, notebookData) {
    const notebook = {
      id: this.generateNotebookId(),
      studentId,
      name: notebookData.name,
      subject: notebookData.subject,
      description: notebookData.description || '',
      color: notebookData.color || '#3B82F6',
      icon: notebookData.icon || '📓',
      createdDate: new Date(),
      lastModified: new Date(),
      noteCount: 0,
      tags: new Set(),
      isPrivate: notebookData.isPrivate || true
    }
    
    this.notebooks.set(notebook.id, notebook)
    
    console.log(`📓 Notebook "${notebook.name}" created for ${notebook.subject}`)
    return notebook
  }

  createNote(notebookId, noteData) {
    const notebook = this.notebooks.get(notebookId)
    if (!notebook) {
      throw new Error('Notebook not found')
    }
    
    const note = {
      id: this.generateNoteId(),
      notebookId,
      title: noteData.title,
      content: noteData.content || '',
      template: noteData.template || null,
      tags: new Set(noteData.tags || []),
      createdDate: new Date(),
      lastModified: new Date(),
      attachments: [],
      links: [],
      isStarred: false,
      wordCount: this.countWords(noteData.content || '')
    }
    
    this.notes.set(note.id, note)
    
    // Update notebook
    notebook.noteCount++
    notebook.lastModified = new Date()
    
    // Update tags
    note.tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set())
      }
      this.tags.get(tag).add(note.id)
    })
    
    // Update search index
    this.updateSearchIndex(note)
    
    console.log(`📝 Note "${note.title}" created in notebook "${notebook.name}"`)
    return note
  }

  updateNote(noteId, updates) {
    const note = this.notes.get(noteId)
    if (!note) {
      throw new Error('Note not found')
    }
    
    // Remove old tags from index
    note.tags.forEach(tag => {
      if (this.tags.has(tag)) {
        this.tags.get(tag).delete(noteId)
      }
    })
    
    // Update note
    Object.keys(updates).forEach(key => {
      if (key === 'tags') {
        note.tags = new Set(updates.tags)
      } else if (key === 'content') {
        note.content = updates.content
        note.wordCount = this.countWords(updates.content)
      } else {
        note[key] = updates[key]
      }
    })
    
    note.lastModified = new Date()
    
    // Update tags index
    note.tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set())
      }
      this.tags.get(tag).add(noteId)
    })
    
    // Update search index
    this.updateSearchIndex(note)
    
    // Update notebook last modified
    const notebook = this.notebooks.get(note.notebookId)
    if (notebook) {
      notebook.lastModified = new Date()
    }
    
    console.log(`📝 Note "${note.title}" updated`)
    return note
  }

  searchNotes(studentId, query, filters = {}) {
    const results = []
    const searchTerm = query.toLowerCase()
    
    for (const [noteId, note] of this.notes) {
      const notebook = this.notebooks.get(note.notebookId)
      
      // Check if note belongs to student
      if (!notebook || notebook.studentId !== studentId) continue
      
      // Apply filters
      if (filters.notebookId && note.notebookId !== filters.notebookId) continue
      if (filters.subject && notebook.subject !== filters.subject) continue
      if (filters.tags && !filters.tags.some(tag => note.tags.has(tag))) continue
      if (filters.starred && !note.isStarred) continue
      
      // Search in title and content
      let relevanceScore = 0
      
      if (note.title.toLowerCase().includes(searchTerm)) {
        relevanceScore += 10
      }
      
      if (note.content.toLowerCase().includes(searchTerm)) {
        relevanceScore += 5
      }
      
      // Search in tags
      note.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchTerm)) {
          relevanceScore += 3
        }
      })
      
      if (relevanceScore > 0) {
        results.push({
          note,
          notebook,
          relevanceScore,
          snippet: this.generateSnippet(note.content, searchTerm)
        })
      }
    }
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  generateSnippet(content, searchTerm, maxLength = 150) {
    const index = content.toLowerCase().indexOf(searchTerm.toLowerCase())
    if (index === -1) return content.substring(0, maxLength) + '...'
    
    const start = Math.max(0, index - 50)
    const end = Math.min(content.length, index + searchTerm.length + 50)
    
    let snippet = content.substring(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'
    
    return snippet
  }

  getStudentNotebooks(studentId) {
    const notebooks = []
    
    for (const [notebookId, notebook] of this.notebooks) {
      if (notebook.studentId === studentId) {
        notebooks.push(notebook)
      }
    }
    
    return notebooks.sort((a, b) => b.lastModified - a.lastModified)
  }

  getNotebookNotes(notebookId, sortBy = 'lastModified') {
    const notes = []
    
    for (const [noteId, note] of this.notes) {
      if (note.notebookId === notebookId) {
        notes.push(note)
      }
    }
    
    // Sort notes
    switch (sortBy) {
      case 'title':
        return notes.sort((a, b) => a.title.localeCompare(b.title))
      case 'created':
        return notes.sort((a, b) => b.createdDate - a.createdDate)
      case 'lastModified':
      default:
        return notes.sort((a, b) => b.lastModified - a.lastModified)
    }
  }

  createTemplate(templateId, templateData) {
    this.templates.set(templateId, {
      id: templateId,
      ...templateData,
      createdDate: new Date()
    })
  }

  getTemplates() {
    return Array.from(this.templates.values())
  }

  updateSearchIndex(note) {
    const words = (note.title + ' ' + note.content).toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
    
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set())
      }
      this.searchIndex.get(word).add(note.id)
    })
  }

  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  generateNotebookId() {
    return 'notebook_' + Math.random().toString(36).substr(2, 9)
  }

  generateNoteId() {
    return 'note_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Research Project Manager
 * Multi-stage project management for academic research
 */
export class ResearchProjectManager {
  constructor() {
    this.projects = new Map()
    this.projectStages = new Map()
    this.resources = new Map()
    this.collaborations = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    // Define standard research project stages
    this.defaultStages = [
      {
        id: 'topic_selection',
        name: 'Topic Selection',
        description: 'Choose and refine research topic',
        tasks: [
          'Brainstorm potential topics',
          'Research topic feasibility',
          'Narrow down to specific question',
          'Get teacher approval'
        ],
        estimatedDays: 3
      },
      {
        id: 'research_planning',
        name: 'Research Planning',
        description: 'Plan research methodology and timeline',
        tasks: [
          'Create research outline',
          'Identify information sources',
          'Plan research methods',
          'Set project timeline'
        ],
        estimatedDays: 5
      },
      {
        id: 'information_gathering',
        name: 'Information Gathering',
        description: 'Collect and organize research materials',
        tasks: [
          'Gather primary sources',
          'Collect secondary sources',
          'Take detailed notes',
          'Organize information'
        ],
        estimatedDays: 10
      },
      {
        id: 'analysis',
        name: 'Analysis & Synthesis',
        description: 'Analyze information and develop arguments',
        tasks: [
          'Analyze collected information',
          'Identify patterns and themes',
          'Develop main arguments',
          'Create supporting evidence'
        ],
        estimatedDays: 7
      },
      {
        id: 'writing',
        name: 'Writing & Documentation',
        description: 'Write and format the research project',
        tasks: [
          'Create project outline',
          'Write first draft',
          'Revise and edit',
          'Format and finalize'
        ],
        estimatedDays: 8
      },
      {
        id: 'presentation',
        name: 'Presentation Preparation',
        description: 'Prepare for project presentation',
        tasks: [
          'Create presentation materials',
          'Practice presentation',
          'Prepare for questions',
          'Final review'
        ],
        estimatedDays: 3
      }
    ]
    
    console.log('🔬 Research Project Manager initialized')
  }

  createProject(studentId, projectData) {
    const project = {
      id: this.generateProjectId(),
      studentId,
      title: projectData.title,
      subject: projectData.subject,
      description: projectData.description,
      type: projectData.type || 'research', // research, experiment, case_study
      dueDate: new Date(projectData.dueDate),
      createdDate: new Date(),
      lastModified: new Date(),
      status: 'planning',
      currentStage: 'topic_selection',
      stages: this.createProjectStages(),
      resources: [],
      collaborators: projectData.collaborators || [],
      notes: '',
      progress: 0
    }
    
    this.projects.set(project.id, project)
    
    console.log(`🔬 Research project "${project.title}" created for ${project.subject}`)
    return project
  }

  createProjectStages() {
    return this.defaultStages.map(stage => ({
      ...stage,
      status: 'not_started',
      startDate: null,
      completedDate: null,
      completedTasks: new Set(),
      notes: '',
      timeSpent: 0
    }))
  }

  updateStageProgress(projectId, stageId, taskIndex, completed) {
    const project = this.projects.get(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    
    const stage = project.stages.find(s => s.id === stageId)
    if (!stage) {
      throw new Error('Stage not found')
    }
    
    if (completed) {
      stage.completedTasks.add(taskIndex)
    } else {
      stage.completedTasks.delete(taskIndex)
    }
    
    // Update stage status
    const totalTasks = stage.tasks.length
    const completedTasksCount = stage.completedTasks.size
    
    if (completedTasksCount === 0) {
      stage.status = 'not_started'
    } else if (completedTasksCount === totalTasks) {
      stage.status = 'completed'
      if (!stage.completedDate) {
        stage.completedDate = new Date()
      }
    } else {
      stage.status = 'in_progress'
      if (!stage.startDate) {
        stage.startDate = new Date()
      }
    }
    
    // Update project progress
    this.updateProjectProgress(project)
    
    console.log(`📋 Stage "${stage.name}" progress updated: ${completedTasksCount}/${totalTasks} tasks`)
    return stage
  }

  updateProjectProgress(project) {
    const totalStages = project.stages.length
    const completedStages = project.stages.filter(s => s.status === 'completed').length
    
    project.progress = (completedStages / totalStages) * 100
    project.lastModified = new Date()
    
    // Update current stage
    const inProgressStage = project.stages.find(s => s.status === 'in_progress')
    const nextNotStartedStage = project.stages.find(s => s.status === 'not_started')
    
    if (inProgressStage) {
      project.currentStage = inProgressStage.id
    } else if (nextNotStartedStage) {
      project.currentStage = nextNotStartedStage.id
    } else {
      project.currentStage = 'completed'
      project.status = 'completed'
    }
  }

  addProjectResource(projectId, resourceData) {
    const project = this.projects.get(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    
    const resource = {
      id: this.generateResourceId(),
      type: resourceData.type, // book, website, interview, document
      title: resourceData.title,
      author: resourceData.author || '',
      url: resourceData.url || '',
      notes: resourceData.notes || '',
      relevance: resourceData.relevance || 'medium', // high, medium, low
      addedDate: new Date(),
      stage: resourceData.stage || project.currentStage
    }
    
    project.resources.push(resource)
    project.lastModified = new Date()
    
    console.log(`📚 Resource "${resource.title}" added to project "${project.title}"`)
    return resource
  }

  getProjectTimeline(projectId) {
    const project = this.projects.get(projectId)
    if (!project) return null
    
    const timeline = []
    let currentDate = new Date()
    
    project.stages.forEach(stage => {
      if (stage.status === 'completed') {
        timeline.push({
          stage: stage.name,
          startDate: stage.startDate,
          endDate: stage.completedDate,
          status: 'completed',
          duration: stage.completedDate - stage.startDate
        })
      } else if (stage.status === 'in_progress') {
        timeline.push({
          stage: stage.name,
          startDate: stage.startDate,
          endDate: null,
          status: 'in_progress',
          duration: new Date() - stage.startDate
        })
      } else {
        // Estimate future dates
        const estimatedStart = currentDate
        const estimatedEnd = new Date(currentDate.getTime() + (stage.estimatedDays * 24 * 60 * 60 * 1000))
        
        timeline.push({
          stage: stage.name,
          startDate: estimatedStart,
          endDate: estimatedEnd,
          status: 'planned',
          duration: stage.estimatedDays * 24 * 60 * 60 * 1000
        })
        
        currentDate = estimatedEnd
      }
    })
    
    return timeline
  }

  getStudentProjects(studentId, status = null) {
    const projects = []
    
    for (const [projectId, project] of this.projects) {
      if (project.studentId === studentId) {
        if (!status || project.status === status) {
          projects.push(project)
        }
      }
    }
    
    return projects.sort((a, b) => b.lastModified - a.lastModified)
  }

  getProjectAnalytics(studentId) {
    const projects = this.getStudentProjects(studentId)
    
    const analytics = {
      totalProjects: projects.length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      inProgressProjects: projects.filter(p => p.status === 'in_progress' || p.status === 'planning').length,
      averageProgress: projects.length > 0 ? 
        projects.reduce((sum, p) => sum + p.progress, 0) / projects.length : 0,
      subjectBreakdown: this.getSubjectBreakdown(projects),
      upcomingDeadlines: this.getUpcomingDeadlines(projects)
    }
    
    return analytics
  }

  getSubjectBreakdown(projects) {
    const breakdown = {}
    
    projects.forEach(project => {
      if (!breakdown[project.subject]) {
        breakdown[project.subject] = {
          total: 0,
          completed: 0,
          averageProgress: 0
        }
      }
      
      breakdown[project.subject].total++
      if (project.status === 'completed') {
        breakdown[project.subject].completed++
      }
    })
    
    // Calculate average progress for each subject
    Object.keys(breakdown).forEach(subject => {
      const subjectProjects = projects.filter(p => p.subject === subject)
      breakdown[subject].averageProgress = subjectProjects.length > 0 ?
        subjectProjects.reduce((sum, p) => sum + p.progress, 0) / subjectProjects.length : 0
    })
    
    return breakdown
  }

  getUpcomingDeadlines(projects, days = 14) {
    const cutoffDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000))
    
    return projects
      .filter(p => p.status !== 'completed' && p.dueDate <= cutoffDate)
      .sort((a, b) => a.dueDate - b.dueDate)
      .map(p => ({
        projectId: p.id,
        title: p.title,
        subject: p.subject,
        dueDate: p.dueDate,
        daysRemaining: Math.ceil((p.dueDate - new Date()) / (24 * 60 * 60 * 1000)),
        progress: p.progress
      }))
  }

  generateProjectId() {
    return 'project_' + Math.random().toString(36).substr(2, 9)
  }

  generateResourceId() {
    return 'resource_' + Math.random().toString(36).substr(2, 9)
  }
}
