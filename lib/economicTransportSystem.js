/**
 * Economic & Transportation System for Rural Zambian Schools
 * Transportation coordination, economic constraint solutions, and practical skills development
 * Designed for communities with limited infrastructure and economic resources
 */

export class EconomicTransportSystem {
  constructor() {
    this.transportRoutes = new Map()
    this.economicPrograms = new Map()
    this.skillsTraining = new Map()
    this.incomeGeneration = new Map()
    this.transportSchedules = new Map()
    this.economicSupport = new Map()
    
    this.initializeTransportation()
    this.setupEconomicPrograms()
    this.configureSkillsTraining()
    this.loadIncomeGeneration()
  }

  /**
   * Initialize transportation coordination system
   */
  initializeTransportation() {
    // Common transportation methods in rural Zambia
    this.transportMethods = {
      walking: {
        name: 'Walking',
        localNames: {
          'bem': 'Ukwenda',
          'ton': 'Kuyenda',
          'nya': 'Kuyenda',
          'loz': 'Ho tsamaya'
        },
        cost: 0,
        capacity: 1,
        weather_dependent: true,
        max_distance: 10, // km
        safety_concerns: ['wild_animals', 'difficult_terrain', 'weather']
      },
      bicycle: {
        name: 'Bicycle',
        localNames: {
          'bem': 'Icinjinga',
          'ton': 'Cinjinga',
          'nya': 'Njinga',
          'loz': 'Baesekele'
        },
        cost: 5, // K5 per trip
        capacity: 2,
        weather_dependent: true,
        max_distance: 25, // km
        maintenance_required: true
      },
      motorbike_taxi: {
        name: 'Motorbike Taxi',
        localNames: {
          'bem': 'Kabova',
          'ton': 'Kabova',
          'nya': 'Kabaza',
          'loz': 'Kabova'
        },
        cost: 15, // K15 per trip
        capacity: 2,
        weather_dependent: true,
        max_distance: 50, // km
        availability: 'limited'
      },
      minibus: {
        name: 'Minibus',
        localNames: {
          'bem': 'Ubwato',
          'ton': 'Bwato',
          'nya': 'Minibasi',
          'loz': 'Bese'
        },
        cost: 25, // K25 per trip
        capacity: 15,
        weather_dependent: false,
        max_distance: 100, // km
        schedule: 'fixed_routes'
      }
    }
    
    // Transportation routes
    this.transportRoutes.set('route_1', {
      name: 'Northern Circuit',
      schools: ['Mwandi Primary', 'Sioma Primary', 'Shangombo Primary'],
      villages: ['Mwandi Village', 'Sioma Village', 'Shangombo Village'],
      distance: 45, // km total
      terrain: 'mostly_flat',
      road_condition: 'poor_in_rainy_season',
      transport_options: ['walking', 'bicycle', 'motorbike_taxi'],
      challenges: ['river_crossings', 'seasonal_flooding', 'wild_animals']
    })
    
    this.transportRoutes.set('route_2', {
      name: 'Southern Circuit',
      schools: ['Kalabo Primary', 'Lukulu Primary', 'Mongu Primary'],
      villages: ['Kalabo Village', 'Lukulu Village', 'Mongu Village'],
      distance: 75, // km total
      terrain: 'hilly',
      road_condition: 'fair',
      transport_options: ['bicycle', 'motorbike_taxi', 'minibus'],
      challenges: ['steep_hills', 'bridge_conditions', 'fuel_availability']
    })
    
    console.log('🚌 Transportation system initialized')
  }

  /**
   * Setup economic support programs
   */
  setupEconomicPrograms() {
    // School fee assistance program
    this.economicPrograms.set('fee_assistance', {
      name: 'School Fee Assistance Program',
      description: 'Support for families unable to afford school fees',
      eligibility_criteria: [
        'Household income below K500/month',
        'Single parent household',
        'Household with disabled member',
        'Orphaned children'
      ],
      support_levels: {
        full_support: {
          coverage: 100,
          requirements: ['extreme_poverty', 'orphaned_status'],
          includes: ['tuition', 'uniforms', 'books', 'meals', 'transport']
        },
        partial_support: {
          coverage: 75,
          requirements: ['low_income', 'large_family'],
          includes: ['tuition', 'meals', 'basic_supplies']
        },
        minimal_support: {
          coverage: 50,
          requirements: ['temporary_hardship'],
          includes: ['tuition', 'meals']
        }
      },
      funding_sources: [
        'government_grants',
        'community_contributions',
        'ngo_partnerships',
        'school_fundraising'
      ]
    })
    
    // Uniform and supplies program
    this.economicPrograms.set('uniform_supplies', {
      name: 'Uniform and Supplies Program',
      description: 'Providing school uniforms and learning materials',
      items: {
        uniforms: {
          boys: ['shirt', 'shorts', 'shoes', 'socks'],
          girls: ['blouse', 'skirt', 'shoes', 'socks'],
          cost_per_set: 150 // K150
        },
        supplies: {
          basic: ['exercise_books', 'pens', 'pencils', 'ruler'],
          advanced: ['textbooks', 'calculator', 'geometry_set'],
          cost_per_set: 75 // K75
        }
      },
      distribution: {
        frequency: 'termly',
        method: 'school_based',
        tracking: 'individual_records'
      }
    })
    
    // Emergency economic support
    this.economicPrograms.set('emergency_support', {
      name: 'Emergency Economic Support',
      description: 'Rapid response for families in crisis',
      triggers: [
        'death_of_breadwinner',
        'serious_illness',
        'crop_failure',
        'natural_disaster'
      ],
      support_types: {
        immediate_cash: {
          amount: 200, // K200
          duration: '1_month',
          conditions: 'emergency_verified'
        },
        food_assistance: {
          items: ['maize_meal', 'cooking_oil', 'beans', 'salt'],
          duration: '3_months',
          conditions: 'family_assessment'
        },
        temporary_accommodation: {
          type: 'community_housing',
          duration: '6_months',
          conditions: 'housing_destroyed'
        }
      }
    })
    
    console.log('💰 Economic support programs configured')
  }

  /**
   * Configure practical skills training
   */
  configureSkillsTraining() {
    // Agricultural skills training
    this.skillsTraining.set('agriculture', {
      name: 'Agricultural Skills Training',
      target_audience: ['students_grade_5_7', 'parents', 'community_members'],
      modules: {
        crop_production: {
          duration: '3_months',
          topics: [
            'Soil preparation and conservation',
            'Seed selection and planting',
            'Pest and disease management',
            'Harvesting and storage'
          ],
          practical_components: [
            'School garden establishment',
            'Demonstration plots',
            'Hands-on farming activities'
          ]
        },
        livestock_management: {
          duration: '2_months',
          topics: [
            'Animal husbandry basics',
            'Feeding and nutrition',
            'Disease prevention',
            'Breeding and reproduction'
          ],
          practical_components: [
            'Small livestock projects',
            'Poultry keeping',
            'Goat rearing'
          ]
        },
        food_processing: {
          duration: '1_month',
          topics: [
            'Food preservation techniques',
            'Value addition methods',
            'Packaging and storage',
            'Marketing strategies'
          ],
          practical_components: [
            'Drying and smoking',
            'Milling and grinding',
            'Packaging workshops'
          ]
        }
      }
    })
    
    // Business and entrepreneurship skills
    this.skillsTraining.set('business', {
      name: 'Business and Entrepreneurship Skills',
      target_audience: ['students_grade_6_7', 'youth', 'women_groups'],
      modules: {
        basic_business: {
          duration: '2_months',
          topics: [
            'Business idea development',
            'Simple record keeping',
            'Customer service',
            'Profit calculation'
          ],
          practical_components: [
            'Mini business projects',
            'Market day participation',
            'Sales practice'
          ]
        },
        financial_literacy: {
          duration: '1_month',
          topics: [
            'Saving and budgeting',
            'Understanding credit',
            'Mobile money usage',
            'Investment basics'
          ],
          practical_components: [
            'Savings group formation',
            'Budget planning exercises',
            'Mobile money training'
          ]
        },
        marketing: {
          duration: '1_month',
          topics: [
            'Product promotion',
            'Pricing strategies',
            'Customer identification',
            'Sales techniques'
          ],
          practical_components: [
            'Market research',
            'Advertisement creation',
            'Sales demonstrations'
          ]
        }
      }
    })
    
    // Technical and vocational skills
    this.skillsTraining.set('technical', {
      name: 'Technical and Vocational Skills',
      target_audience: ['students_grade_7', 'youth', 'adults'],
      modules: {
        carpentry: {
          duration: '4_months',
          topics: [
            'Wood selection and preparation',
            'Basic joinery techniques',
            'Tool usage and maintenance',
            'Furniture making'
          ],
          practical_components: [
            'Workshop projects',
            'Furniture construction',
            'Repair services'
          ]
        },
        tailoring: {
          duration: '3_months',
          topics: [
            'Pattern making',
            'Cutting and sewing',
            'Machine operation',
            'Design basics'
          ],
          practical_components: [
            'Uniform production',
            'Clothing repairs',
            'Custom tailoring'
          ]
        },
        mechanics: {
          duration: '6_months',
          topics: [
            'Bicycle repair',
            'Motorbike maintenance',
            'Tool usage',
            'Troubleshooting'
          ],
          practical_components: [
            'Repair workshops',
            'Maintenance services',
            'Community repairs'
          ]
        }
      }
    })
    
    console.log('🔧 Skills training programs configured')
  }

  /**
   * Load income generation projects
   */
  loadIncomeGeneration() {
    // School-based income generation
    this.incomeGeneration.set('school_projects', {
      name: 'School-Based Income Generation',
      projects: {
        school_garden: {
          description: 'Vegetable production for sale and consumption',
          investment: 500, // K500 startup
          expected_monthly_income: 300, // K300
          participants: ['students', 'teachers', 'parents'],
          crops: ['tomatoes', 'onions', 'cabbage', 'rape'],
          market: 'local_community'
        },
        poultry_project: {
          description: 'Chicken rearing for eggs and meat',
          investment: 800, // K800 startup
          expected_monthly_income: 400, // K400
          participants: ['students', 'community_members'],
          products: ['eggs', 'broiler_chickens'],
          market: 'local_and_nearby_towns'
        },
        craft_production: {
          description: 'Traditional crafts and handmade items',
          investment: 200, // K200 startup
          expected_monthly_income: 150, // K150
          participants: ['students', 'women_groups'],
          products: ['baskets', 'mats', 'pottery'],
          market: 'tourist_areas_and_towns'
        }
      }
    })
    
    // Community-based income generation
    this.incomeGeneration.set('community_projects', {
      name: 'Community-Based Income Generation',
      projects: {
        cooperative_farming: {
          description: 'Large-scale farming through community cooperation',
          investment: 2000, // K2000 startup
          expected_monthly_income: 800, // K800
          participants: ['multiple_families'],
          crops: ['maize', 'groundnuts', 'beans'],
          market: 'district_markets'
        },
        fish_farming: {
          description: 'Aquaculture in community ponds',
          investment: 1500, // K1500 startup
          expected_monthly_income: 600, // K600
          participants: ['fishing_groups'],
          products: ['fresh_fish', 'dried_fish'],
          market: 'regional_markets'
        },
        transport_services: {
          description: 'Community transport cooperative',
          investment: 5000, // K5000 startup
          expected_monthly_income: 1200, // K1200
          participants: ['drivers_and_owners'],
          services: ['passenger_transport', 'goods_transport'],
          market: 'local_and_regional'
        }
      }
    })
    
    console.log('💼 Income generation projects loaded')
  }

  /**
   * Plan transportation route
   */
  planTransportRoute(origin, destination, preferences = {}) {
    const {
      max_cost = 50,
      preferred_method = null,
      weather_conditions = 'good',
      urgency = 'normal'
    } = preferences
    
    // Find available routes
    const availableRoutes = this.findAvailableRoutes(origin, destination)
    
    if (availableRoutes.length === 0) {
      return {
        success: false,
        message: 'No available routes found',
        alternatives: this.suggestAlternatives(origin, destination)
      }
    }
    
    // Score routes based on preferences
    const scoredRoutes = availableRoutes.map(route => {
      let score = 0
      
      // Cost factor
      if (route.cost <= max_cost) {
        score += 30
      }
      
      // Weather suitability
      if (!route.weather_dependent || weather_conditions === 'good') {
        score += 25
      }
      
      // Preferred method
      if (preferred_method && route.method === preferred_method) {
        score += 20
      }
      
      // Urgency factor
      if (urgency === 'high' && route.duration < 60) {
        score += 15
      }
      
      // Safety factor
      score += route.safety_score || 10
      
      return { ...route, score }
    })
    
    // Sort by score
    scoredRoutes.sort((a, b) => b.score - a.score)
    
    return {
      success: true,
      recommended_route: scoredRoutes[0],
      alternative_routes: scoredRoutes.slice(1, 3),
      travel_tips: this.generateTravelTips(scoredRoutes[0])
    }
  }

  /**
   * Schedule transportation for students
   */
  scheduleStudentTransport(studentData) {
    const {
      student_id,
      home_location,
      school_location,
      transport_budget,
      special_needs = false
    } = studentData
    
    const schedule = {
      student_id,
      weekly_schedule: {},
      monthly_cost: 0,
      transport_method: null,
      special_arrangements: []
    }
    
    // Plan route for each school day
    const schoolDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    
    for (const day of schoolDays) {
      const route = this.planTransportRoute(home_location, school_location, {
        max_cost: transport_budget / 10, // Daily budget
        urgency: 'normal'
      })
      
      if (route.success) {
        schedule.weekly_schedule[day] = {
          to_school: {
            departure_time: '06:30',
            arrival_time: '07:30',
            method: route.recommended_route.method,
            cost: route.recommended_route.cost
          },
          from_school: {
            departure_time: '15:00',
            arrival_time: '16:00',
            method: route.recommended_route.method,
            cost: route.recommended_route.cost
          }
        }
        
        schedule.monthly_cost += route.recommended_route.cost * 2 * 4 // Round trip, 4 weeks
      }
    }
    
    // Add special arrangements if needed
    if (special_needs) {
      schedule.special_arrangements.push({
        type: 'accessibility_support',
        description: 'Arrange accessible transport method',
        additional_cost: 20 // K20 per month
      })
    }
    
    return schedule
  }

  /**
   * Apply for economic assistance
   */
  applyForEconomicAssistance(applicationData) {
    const {
      family_id,
      assistance_type,
      household_income,
      family_size,
      special_circumstances,
      supporting_documents
    } = applicationData
    
    const application = {
      id: this.generateApplicationId(),
      family_id,
      assistance_type,
      application_date: new Date(),
      status: 'pending_review',
      eligibility_score: 0,
      recommended_support: null
    }
    
    // Calculate eligibility score
    let score = 0
    
    // Income factor (40% of score)
    if (household_income < 300) {
      score += 40
    } else if (household_income < 500) {
      score += 30
    } else if (household_income < 800) {
      score += 20
    }
    
    // Family size factor (20% of score)
    if (family_size > 6) {
      score += 20
    } else if (family_size > 4) {
      score += 15
    } else {
      score += 10
    }
    
    // Special circumstances (40% of score)
    if (special_circumstances.includes('orphaned_children')) {
      score += 20
    }
    if (special_circumstances.includes('disabled_member')) {
      score += 15
    }
    if (special_circumstances.includes('single_parent')) {
      score += 10
    }
    if (special_circumstances.includes('chronic_illness')) {
      score += 15
    }
    
    application.eligibility_score = score
    
    // Determine recommended support level
    if (score >= 70) {
      application.recommended_support = 'full_support'
      application.status = 'approved'
    } else if (score >= 50) {
      application.recommended_support = 'partial_support'
      application.status = 'approved'
    } else if (score >= 30) {
      application.recommended_support = 'minimal_support'
      application.status = 'conditional_approval'
    } else {
      application.status = 'requires_review'
    }
    
    // Store application
    this.economicSupport.set(application.id, application)
    
    console.log(`📋 Economic assistance application processed: ${application.id}`)
    
    return application
  }

  /**
   * Enroll in skills training program
   */
  enrollInSkillsTraining(enrollmentData) {
    const {
      participant_id,
      program_type,
      module,
      preferred_schedule,
      payment_method = 'free'
    } = enrollmentData
    
    const program = this.skillsTraining.get(program_type)
    if (!program) {
      throw new Error('Skills training program not found')
    }
    
    const moduleData = program.modules[module]
    if (!moduleData) {
      throw new Error('Training module not found')
    }
    
    const enrollment = {
      id: this.generateEnrollmentId(),
      participant_id,
      program_type,
      module,
      enrollment_date: new Date(),
      status: 'enrolled',
      progress: 0,
      completion_date: null,
      certificate_issued: false,
      schedule: this.generateTrainingSchedule(moduleData, preferred_schedule)
    }
    
    console.log(`🎓 Skills training enrollment: ${enrollment.id}`)
    
    return enrollment
  }

  /**
   * Start income generation project
   */
  startIncomeProject(projectData) {
    const {
      project_type,
      project_name,
      participants,
      initial_investment,
      funding_source
    } = projectData
    
    const project = {
      id: this.generateProjectId(),
      project_type,
      project_name,
      participants,
      start_date: new Date(),
      status: 'planning',
      investment: {
        initial: initial_investment,
        source: funding_source,
        additional_needed: 0
      },
      financial_tracking: {
        income: [],
        expenses: [],
        profit: 0
      },
      milestones: this.generateProjectMilestones(project_type)
    }
    
    console.log(`🚀 Income generation project started: ${project.id}`)
    
    return project
  }

  /**
   * Get economic and transport statistics
   */
  getEconomicTransportStats() {
    const totalApplications = this.economicSupport.size
    let approvedApplications = 0
    let totalAssistanceAmount = 0
    
    for (const [id, application] of this.economicSupport) {
      if (application.status === 'approved') {
        approvedApplications++
        // Calculate assistance amount based on support level
        const supportLevel = application.recommended_support
        if (supportLevel === 'full_support') {
          totalAssistanceAmount += 500
        } else if (supportLevel === 'partial_support') {
          totalAssistanceAmount += 300
        } else if (supportLevel === 'minimal_support') {
          totalAssistanceAmount += 150
        }
      }
    }
    
    return {
      economicSupport: {
        totalApplications,
        approvedApplications,
        approvalRate: totalApplications > 0 ? (approvedApplications / totalApplications * 100).toFixed(1) : 0,
        totalAssistanceAmount,
        averageAssistance: approvedApplications > 0 ? (totalAssistanceAmount / approvedApplications).toFixed(2) : 0
      },
      transportation: {
        activeRoutes: this.transportRoutes.size,
        transportMethods: Object.keys(this.transportMethods).length,
        averageTransportCost: this.calculateAverageTransportCost()
      },
      skillsTraining: {
        availablePrograms: this.skillsTraining.size,
        totalModules: this.getTotalModulesCount(),
        activeEnrollments: this.getActiveEnrollmentsCount()
      },
      incomeGeneration: {
        activeProjects: this.getActiveProjectsCount(),
        totalInvestment: this.getTotalInvestment(),
        averageMonthlyIncome: this.getAverageMonthlyIncome()
      }
    }
  }

  // Helper methods
  findAvailableRoutes(origin, destination) {
    // Implementation for finding available routes
    return [
      {
        method: 'bicycle',
        cost: 10,
        duration: 45,
        weather_dependent: true,
        safety_score: 15
      },
      {
        method: 'walking',
        cost: 0,
        duration: 120,
        weather_dependent: true,
        safety_score: 10
      }
    ]
  }

  suggestAlternatives(origin, destination) {
    return [
      'Consider staying overnight at school during difficult weather',
      'Arrange shared transport with other families',
      'Use community transport cooperative'
    ]
  }

  generateTravelTips(route) {
    return [
      'Start early to avoid afternoon heat',
      'Carry water and snacks',
      'Check weather conditions before departure',
      'Travel in groups when possible'
    ]
  }

  generateApplicationId() {
    return `APP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateEnrollmentId() {
    return `ENR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateProjectId() {
    return `PRJ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateTrainingSchedule(moduleData, preferences) {
    return {
      duration: moduleData.duration,
      sessions_per_week: 2,
      session_duration: '2_hours',
      preferred_days: preferences.days || ['tuesday', 'thursday'],
      start_time: preferences.time || '14:00'
    }
  }

  generateProjectMilestones(projectType) {
    const milestones = {
      'school_garden': [
        'Land preparation completed',
        'Seeds planted',
        'First harvest',
        'Market sales begin'
      ],
      'poultry_project': [
        'Chicken house constructed',
        'Chickens acquired',
        'First eggs collected',
        'Regular sales established'
      ]
    }
    
    return milestones[projectType] || ['Project planning', 'Implementation', 'Evaluation']
  }

  calculateAverageTransportCost() {
    const costs = Object.values(this.transportMethods).map(method => method.cost)
    return costs.reduce((sum, cost) => sum + cost, 0) / costs.length
  }

  getTotalModulesCount() {
    let total = 0
    for (const program of this.skillsTraining.values()) {
      total += Object.keys(program.modules).length
    }
    return total
  }

  getActiveEnrollmentsCount() {
    // Placeholder - implement with actual enrollment data
    return 0
  }

  getActiveProjectsCount() {
    // Placeholder - implement with actual project data
    return 0
  }

  getTotalInvestment() {
    // Placeholder - implement with actual investment data
    return 0
  }

  getAverageMonthlyIncome() {
    // Placeholder - implement with actual income data
    return 0
  }
}

// Export singleton instance
export const economicTransportSystem = new EconomicTransportSystem()
