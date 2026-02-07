/**
 * Study Productivity Tools
 * Time tracking, calculators, and productivity analysis for students
 * Optimized for offline use in rural Zambian schools
 */

/**
 * Study Time Tracker System
 * Track study sessions and analyze productivity patterns
 */
export class StudyTimeTracker {
  constructor() {
    this.studySessions = new Map()
    this.studentStats = new Map()
    this.subjects = new Map()
    this.goals = new Map()
    this.productivity = new Map()
    
    this.initializeSystem()
  }

  initializeSystem() {
    // Initialize common subjects
    const commonSubjects = [
      { id: 'mathematics', name: 'Mathematics', icon: '📐', color: '#3B82F6' },
      { id: 'english', name: 'English', icon: '📚', color: '#10B981' },
      { id: 'science', name: 'Science', icon: '🔬', color: '#8B5CF6' },
      { id: 'social_studies', name: 'Social Studies', icon: '🌍', color: '#F59E0B' },
      { id: 'bemba', name: 'Bemba', icon: '🗣️', color: '#EF4444' },
      { id: 'agriculture', name: 'Agriculture', icon: '🌱', color: '#22C55E' }
    ]
    
    commonSubjects.forEach(subject => {
      this.subjects.set(subject.id, subject)
    })
    
    console.log('⏱️ Study Time Tracker initialized')
  }

  startStudySession(studentId, sessionData) {
    const session = {
      id: this.generateSessionId(),
      studentId,
      subject: sessionData.subject,
      topic: sessionData.topic || '',
      startTime: new Date(),
      endTime: null,
      duration: 0,
      breaks: [],
      productivity: null,
      notes: '',
      goals: sessionData.goals || [],
      status: 'active'
    }
    
    this.studySessions.set(session.id, session)
    
    console.log(`⏱️ Study session started: ${session.subject} - ${session.topic}`)
    return session
  }

  takeBreak(sessionId, breakType = 'short') {
    const session = this.studySessions.get(sessionId)
    if (!session || session.status !== 'active') return null
    
    const breakData = {
      id: this.generateBreakId(),
      type: breakType, // 'short', 'long', 'meal'
      startTime: new Date(),
      endTime: null,
      duration: 0
    }
    
    session.breaks.push(breakData)
    session.status = 'on_break'
    
    console.log(`☕ Break started: ${breakType}`)
    return breakData
  }

  endBreak(sessionId) {
    const session = this.studySessions.get(sessionId)
    if (!session || session.status !== 'on_break') return null
    
    const currentBreak = session.breaks[session.breaks.length - 1]
    if (currentBreak && !currentBreak.endTime) {
      currentBreak.endTime = new Date()
      currentBreak.duration = currentBreak.endTime - currentBreak.startTime
      session.status = 'active'
      
      console.log(`✅ Break ended: ${currentBreak.duration / 1000 / 60} minutes`)
      return currentBreak
    }
    
    return null
  }

  endStudySession(sessionId, sessionNotes = '', productivityRating = null) {
    const session = this.studySessions.get(sessionId)
    if (!session) return null
    
    // End any active break
    if (session.status === 'on_break') {
      this.endBreak(sessionId)
    }
    
    session.endTime = new Date()
    session.duration = session.endTime - session.startTime
    session.notes = sessionNotes
    session.productivity = productivityRating
    session.status = 'completed'
    
    // Update student statistics
    this.updateStudentStats(session)
    
    console.log(`✅ Study session completed: ${session.duration / 1000 / 60} minutes`)
    return session
  }

  updateStudentStats(session) {
    const studentId = session.studentId
    
    if (!this.studentStats.has(studentId)) {
      this.studentStats.set(studentId, {
        totalSessions: 0,
        totalStudyTime: 0,
        totalBreakTime: 0,
        subjectBreakdown: new Map(),
        averageProductivity: 0,
        longestSession: 0,
        studyStreak: 0,
        lastStudyDate: null
      })
    }
    
    const stats = this.studentStats.get(studentId)
    
    // Update basic stats
    stats.totalSessions++
    stats.totalStudyTime += session.duration
    stats.totalBreakTime += session.breaks.reduce((total, br) => total + (br.duration || 0), 0)
    
    // Update subject breakdown
    if (!stats.subjectBreakdown.has(session.subject)) {
      stats.subjectBreakdown.set(session.subject, {
        sessions: 0,
        totalTime: 0,
        averageProductivity: 0
      })
    }
    
    const subjectStats = stats.subjectBreakdown.get(session.subject)
    subjectStats.sessions++
    subjectStats.totalTime += session.duration
    
    // Update productivity averages
    if (session.productivity !== null) {
      const totalProductivitySessions = Array.from(this.studySessions.values())
        .filter(s => s.studentId === studentId && s.productivity !== null)
      
      if (totalProductivitySessions.length > 0) {
        stats.averageProductivity = totalProductivitySessions
          .reduce((sum, s) => sum + s.productivity, 0) / totalProductivitySessions.length
        
        const subjectProductivitySessions = totalProductivitySessions
          .filter(s => s.subject === session.subject)
        
        if (subjectProductivitySessions.length > 0) {
          subjectStats.averageProductivity = subjectProductivitySessions
            .reduce((sum, s) => sum + s.productivity, 0) / subjectProductivitySessions.length
        }
      }
    }
    
    // Update longest session
    if (session.duration > stats.longestSession) {
      stats.longestSession = session.duration
    }
    
    // Update study streak
    const today = new Date().toDateString()
    const sessionDate = session.startTime.toDateString()
    
    if (sessionDate === today) {
      if (stats.lastStudyDate) {
        const lastDate = new Date(stats.lastStudyDate)
        const daysDiff = (new Date(today) - lastDate) / (1000 * 60 * 60 * 24)
        
        if (daysDiff === 1) {
          stats.studyStreak++
        } else if (daysDiff > 1) {
          stats.studyStreak = 1
        }
      } else {
        stats.studyStreak = 1
      }
      
      stats.lastStudyDate = today
    }
  }

  getStudentStats(studentId) {
    const stats = this.studentStats.get(studentId)
    if (!stats) return null
    
    // Convert Map to Object for easier use
    const subjectBreakdown = {}
    stats.subjectBreakdown.forEach((value, key) => {
      subjectBreakdown[key] = {
        ...value,
        averageSessionTime: value.sessions > 0 ? value.totalTime / value.sessions : 0
      }
    })
    
    return {
      ...stats,
      subjectBreakdown,
      averageSessionTime: stats.totalSessions > 0 ? stats.totalStudyTime / stats.totalSessions : 0,
      totalStudyHours: stats.totalStudyTime / (1000 * 60 * 60),
      totalBreakHours: stats.totalBreakTime / (1000 * 60 * 60)
    }
  }

  getWeeklyReport(studentId) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const sessions = Array.from(this.studySessions.values())
      .filter(s => s.studentId === studentId && s.startTime >= oneWeekAgo && s.status === 'completed')
    
    const dailyBreakdown = {}
    const subjectBreakdown = {}
    
    sessions.forEach(session => {
      const day = session.startTime.toDateString()
      
      if (!dailyBreakdown[day]) {
        dailyBreakdown[day] = {
          sessions: 0,
          totalTime: 0,
          subjects: new Set()
        }
      }
      
      dailyBreakdown[day].sessions++
      dailyBreakdown[day].totalTime += session.duration
      dailyBreakdown[day].subjects.add(session.subject)
      
      if (!subjectBreakdown[session.subject]) {
        subjectBreakdown[session.subject] = {
          sessions: 0,
          totalTime: 0
        }
      }
      
      subjectBreakdown[session.subject].sessions++
      subjectBreakdown[session.subject].totalTime += session.duration
    })
    
    return {
      totalSessions: sessions.length,
      totalTime: sessions.reduce((sum, s) => sum + s.duration, 0),
      averageProductivity: sessions.length > 0 ? 
        sessions.filter(s => s.productivity !== null)
          .reduce((sum, s) => sum + s.productivity, 0) / sessions.filter(s => s.productivity !== null).length : 0,
      dailyBreakdown,
      subjectBreakdown,
      studyDays: Object.keys(dailyBreakdown).length
    }
  }

  setStudyGoal(studentId, goalData) {
    const goal = {
      id: this.generateGoalId(),
      studentId,
      type: goalData.type, // 'daily', 'weekly', 'subject'
      target: goalData.target, // minutes
      subject: goalData.subject || null,
      startDate: new Date(goalData.startDate || Date.now()),
      endDate: goalData.endDate ? new Date(goalData.endDate) : null,
      status: 'active'
    }
    
    this.goals.set(goal.id, goal)
    
    console.log(`🎯 Study goal set: ${goal.type} - ${goal.target} minutes`)
    return goal
  }

  checkGoalProgress(studentId, goalId) {
    const goal = this.goals.get(goalId)
    if (!goal || goal.studentId !== studentId) return null
    
    let progress = 0
    let timeFrame
    
    switch (goal.type) {
      case 'daily':
        timeFrame = new Date()
        timeFrame.setHours(0, 0, 0, 0)
        break
      case 'weekly':
        timeFrame = new Date()
        timeFrame.setDate(timeFrame.getDate() - timeFrame.getDay())
        timeFrame.setHours(0, 0, 0, 0)
        break
      default:
        timeFrame = goal.startDate
    }
    
    const sessions = Array.from(this.studySessions.values())
      .filter(s => s.studentId === studentId && 
                   s.startTime >= timeFrame && 
                   s.status === 'completed' &&
                   (!goal.subject || s.subject === goal.subject))
    
    progress = sessions.reduce((sum, s) => sum + s.duration, 0) / (1000 * 60) // Convert to minutes
    
    return {
      goal,
      progress,
      target: goal.target,
      percentage: Math.min((progress / goal.target) * 100, 100),
      remaining: Math.max(goal.target - progress, 0),
      achieved: progress >= goal.target
    }
  }

  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9)
  }

  generateBreakId() {
    return 'break_' + Math.random().toString(36).substr(2, 9)
  }

  generateGoalId() {
    return 'goal_' + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * Subject-Specific Calculator System
 * Educational calculators for different subjects
 */
export class SubjectCalculatorSystem {
  constructor() {
    this.calculators = new Map()
    this.calculationHistory = new Map()
    
    this.initializeCalculators()
  }

  initializeCalculators() {
    // Mathematics Calculators
    this.calculators.set('basic_math', {
      name: 'Basic Calculator',
      subject: 'mathematics',
      description: 'Basic arithmetic operations',
      functions: ['add', 'subtract', 'multiply', 'divide', 'percentage', 'square', 'sqrt']
    })
    
    this.calculators.set('geometry', {
      name: 'Geometry Calculator',
      subject: 'mathematics',
      description: 'Area, perimeter, and volume calculations',
      functions: ['rectangle_area', 'circle_area', 'triangle_area', 'cylinder_volume', 'sphere_volume']
    })
    
    this.calculators.set('algebra', {
      name: 'Algebra Helper',
      subject: 'mathematics',
      description: 'Solve linear equations and quadratic formulas',
      functions: ['linear_equation', 'quadratic_formula', 'slope', 'distance']
    })
    
    // Science Calculators
    this.calculators.set('physics', {
      name: 'Physics Calculator',
      subject: 'science',
      description: 'Physics formulas and conversions',
      functions: ['velocity', 'acceleration', 'force', 'energy', 'power']
    })
    
    this.calculators.set('chemistry', {
      name: 'Chemistry Calculator',
      subject: 'science',
      description: 'Chemical calculations and conversions',
      functions: ['molarity', 'molar_mass', 'gas_law', 'ph_calculation']
    })
    
    // Agriculture Calculators
    this.calculators.set('agriculture', {
      name: 'Agriculture Calculator',
      subject: 'agriculture',
      description: 'Farming calculations for Zambian agriculture',
      functions: ['field_area', 'seed_quantity', 'fertilizer_amount', 'harvest_yield', 'profit_loss']
    })
    
    console.log('🧮 Subject Calculator System initialized')
  }

  calculate(calculatorId, operation, parameters, studentId = null) {
    const calculator = this.calculators.get(calculatorId)
    if (!calculator) {
      throw new Error(`Calculator ${calculatorId} not found`)
    }
    
    if (!calculator.functions.includes(operation)) {
      throw new Error(`Operation ${operation} not supported by ${calculator.name}`)
    }
    
    let result
    
    try {
      switch (calculatorId) {
        case 'basic_math':
          result = this.calculateBasicMath(operation, parameters)
          break
        case 'geometry':
          result = this.calculateGeometry(operation, parameters)
          break
        case 'algebra':
          result = this.calculateAlgebra(operation, parameters)
          break
        case 'physics':
          result = this.calculatePhysics(operation, parameters)
          break
        case 'chemistry':
          result = this.calculateChemistry(operation, parameters)
          break
        case 'agriculture':
          result = this.calculateAgriculture(operation, parameters)
          break
        default:
          throw new Error(`Calculator ${calculatorId} not implemented`)
      }
      
      // Store calculation in history
      if (studentId) {
        this.storeCalculation(studentId, calculatorId, operation, parameters, result)
      }
      
      return result
      
    } catch (error) {
      console.error(`Calculation error: ${error.message}`)
      throw error
    }
  }

  calculateBasicMath(operation, params) {
    switch (operation) {
      case 'add':
        return { result: params.a + params.b, formula: `${params.a} + ${params.b}` }
      case 'subtract':
        return { result: params.a - params.b, formula: `${params.a} - ${params.b}` }
      case 'multiply':
        return { result: params.a * params.b, formula: `${params.a} × ${params.b}` }
      case 'divide':
        if (params.b === 0) throw new Error('Division by zero')
        return { result: params.a / params.b, formula: `${params.a} ÷ ${params.b}` }
      case 'percentage':
        return { result: (params.value * params.percentage) / 100, formula: `${params.percentage}% of ${params.value}` }
      case 'square':
        return { result: params.value * params.value, formula: `${params.value}²` }
      case 'sqrt':
        if (params.value < 0) throw new Error('Cannot calculate square root of negative number')
        return { result: Math.sqrt(params.value), formula: `√${params.value}` }
      default:
        throw new Error(`Unknown basic math operation: ${operation}`)
    }
  }

  calculateGeometry(operation, params) {
    switch (operation) {
      case 'rectangle_area':
        return { 
          result: params.length * params.width, 
          formula: `Area = length × width = ${params.length} × ${params.width}`,
          unit: 'square units'
        }
      case 'circle_area':
        const area = Math.PI * params.radius * params.radius
        return { 
          result: area, 
          formula: `Area = π × r² = π × ${params.radius}²`,
          unit: 'square units'
        }
      case 'triangle_area':
        return { 
          result: 0.5 * params.base * params.height, 
          formula: `Area = ½ × base × height = ½ × ${params.base} × ${params.height}`,
          unit: 'square units'
        }
      case 'cylinder_volume':
        const volume = Math.PI * params.radius * params.radius * params.height
        return { 
          result: volume, 
          formula: `Volume = π × r² × h = π × ${params.radius}² × ${params.height}`,
          unit: 'cubic units'
        }
      case 'sphere_volume':
        const sphereVolume = (4/3) * Math.PI * Math.pow(params.radius, 3)
        return { 
          result: sphereVolume, 
          formula: `Volume = (4/3) × π × r³ = (4/3) × π × ${params.radius}³`,
          unit: 'cubic units'
        }
      default:
        throw new Error(`Unknown geometry operation: ${operation}`)
    }
  }

  calculateAlgebra(operation, params) {
    switch (operation) {
      case 'linear_equation':
        // Solve ax + b = 0
        if (params.a === 0) throw new Error('Coefficient a cannot be zero')
        const x = -params.b / params.a
        return { 
          result: x, 
          formula: `${params.a}x + ${params.b} = 0, x = ${x}`,
          steps: [`${params.a}x = -${params.b}`, `x = -${params.b}/${params.a}`, `x = ${x}`]
        }
      case 'quadratic_formula':
        // Solve ax² + bx + c = 0
        const { a, b, c } = params
        const discriminant = b * b - 4 * a * c
        
        if (discriminant < 0) {
          return { result: 'No real solutions', formula: `Discriminant = ${discriminant} < 0` }
        }
        
        const x1 = (-b + Math.sqrt(discriminant)) / (2 * a)
        const x2 = (-b - Math.sqrt(discriminant)) / (2 * a)
        
        return { 
          result: { x1, x2 }, 
          formula: `x = (-b ± √(b² - 4ac)) / 2a`,
          discriminant,
          steps: [
            `a = ${a}, b = ${b}, c = ${c}`,
            `Discriminant = ${b}² - 4(${a})(${c}) = ${discriminant}`,
            `x₁ = (${-b} + √${discriminant}) / ${2 * a} = ${x1}`,
            `x₂ = (${-b} - √${discriminant}) / ${2 * a} = ${x2}`
          ]
        }
      default:
        throw new Error(`Unknown algebra operation: ${operation}`)
    }
  }

  calculatePhysics(operation, params) {
    switch (operation) {
      case 'velocity':
        return { 
          result: params.distance / params.time, 
          formula: `v = d/t = ${params.distance}/${params.time}`,
          unit: 'm/s'
        }
      case 'acceleration':
        return { 
          result: (params.final_velocity - params.initial_velocity) / params.time, 
          formula: `a = (v₂ - v₁)/t = (${params.final_velocity} - ${params.initial_velocity})/${params.time}`,
          unit: 'm/s²'
        }
      case 'force':
        return { 
          result: params.mass * params.acceleration, 
          formula: `F = ma = ${params.mass} × ${params.acceleration}`,
          unit: 'N'
        }
      case 'energy':
        return { 
          result: 0.5 * params.mass * params.velocity * params.velocity, 
          formula: `KE = ½mv² = ½ × ${params.mass} × ${params.velocity}²`,
          unit: 'J'
        }
      default:
        throw new Error(`Unknown physics operation: ${operation}`)
    }
  }

  calculateChemistry(operation, params) {
    switch (operation) {
      case 'molarity':
        return { 
          result: params.moles / params.volume, 
          formula: `M = n/V = ${params.moles}/${params.volume}`,
          unit: 'mol/L'
        }
      case 'molar_mass':
        // Simplified - would need periodic table data
        return { 
          result: params.mass / params.moles, 
          formula: `MM = m/n = ${params.mass}/${params.moles}`,
          unit: 'g/mol'
        }
      default:
        throw new Error(`Unknown chemistry operation: ${operation}`)
    }
  }

  calculateAgriculture(operation, params) {
    switch (operation) {
      case 'field_area':
        return { 
          result: params.length * params.width, 
          formula: `Area = length × width = ${params.length}m × ${params.width}m`,
          unit: 'm²',
          hectares: (params.length * params.width) / 10000
        }
      case 'seed_quantity':
        // Seeds needed per hectare
        const area_hectares = params.area / 10000
        return { 
          result: params.seeds_per_hectare * area_hectares, 
          formula: `Seeds = ${params.seeds_per_hectare} seeds/ha × ${area_hectares} ha`,
          unit: 'seeds'
        }
      case 'fertilizer_amount':
        const area_ha = params.area / 10000
        return { 
          result: params.rate_per_hectare * area_ha, 
          formula: `Fertilizer = ${params.rate_per_hectare} kg/ha × ${area_ha} ha`,
          unit: 'kg'
        }
      case 'harvest_yield':
        return { 
          result: params.total_harvest / (params.area / 10000), 
          formula: `Yield = ${params.total_harvest} kg ÷ ${params.area / 10000} ha`,
          unit: 'kg/ha'
        }
      case 'profit_loss':
        const profit = params.revenue - params.costs
        return { 
          result: profit, 
          formula: `Profit = Revenue - Costs = ${params.revenue} - ${params.costs}`,
          unit: 'ZMW',
          percentage: params.costs > 0 ? (profit / params.costs) * 100 : 0
        }
      default:
        throw new Error(`Unknown agriculture operation: ${operation}`)
    }
  }

  storeCalculation(studentId, calculatorId, operation, parameters, result) {
    if (!this.calculationHistory.has(studentId)) {
      this.calculationHistory.set(studentId, [])
    }
    
    const calculation = {
      id: this.generateCalculationId(),
      calculatorId,
      operation,
      parameters,
      result,
      timestamp: new Date()
    }
    
    this.calculationHistory.get(studentId).push(calculation)
    
    // Keep only last 100 calculations per student
    const history = this.calculationHistory.get(studentId)
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }

  getCalculationHistory(studentId, limit = 20) {
    const history = this.calculationHistory.get(studentId) || []
    return history.slice(-limit).reverse()
  }

  getAvailableCalculators() {
    const calculatorList = []
    
    this.calculators.forEach((calculator, id) => {
      calculatorList.push({
        id,
        ...calculator
      })
    })
    
    return calculatorList.sort((a, b) => a.subject.localeCompare(b.subject))
  }

  generateCalculationId() {
    return 'calc_' + Math.random().toString(36).substr(2, 9)
  }
}
