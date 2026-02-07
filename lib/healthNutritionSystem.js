/**
 * Health, Nutrition & Community System for Rural Zambian Schools
 * Comprehensive health monitoring, nutrition tracking, and community engagement
 * Designed for resource-constrained environments with limited medical facilities
 */

export class HealthNutritionSystem {
  constructor() {
    this.healthRecords = new Map()
    this.nutritionPrograms = new Map()
    this.communityHealth = new Map()
    this.familySupport = new Map()
    this.healthAlerts = []
    this.nutritionTracking = new Map()
    
    this.initializeHealthMonitoring()
    this.setupNutritionPrograms()
    this.configureCommunityHealth()
    this.loadFamilySupport()
  }

  /**
   * Initialize comprehensive health monitoring system
   */
  initializeHealthMonitoring() {
    // Common health issues in rural Zambia
    this.healthConditions = {
      malaria: {
        name: 'Malaria',
        localNames: {
          'bem': 'Malaria',
          'ton': 'Malaria',
          'nya': 'Malungo',
          'loz': 'Malaria'
        },
        symptoms: ['fever', 'headache', 'vomiting', 'fatigue'],
        prevention: ['bed_nets', 'clean_water', 'proper_drainage'],
        treatment: 'immediate_medical_attention',
        severity: 'high',
        seasonal: ['rainy_season']
      },
      malnutrition: {
        name: 'Malnutrition',
        localNames: {
          'bem': 'Ukusaka',
          'ton': 'Nzala',
          'nya': 'Kusowa chakudya',
          'loz': 'Tlala'
        },
        symptoms: ['weight_loss', 'stunted_growth', 'fatigue', 'poor_concentration'],
        prevention: ['balanced_diet', 'school_feeding', 'nutrition_education'],
        treatment: 'nutritional_support',
        severity: 'high',
        seasonal: ['hunger_season']
      },
      diarrhea: {
        name: 'Diarrheal Diseases',
        localNames: {
          'bem': 'Ukutuluka',
          'ton': 'Kutuluka',
          'nya': 'Kutsegula',
          'loz': 'Ho tšoha'
        },
        symptoms: ['loose_stools', 'dehydration', 'abdominal_pain'],
        prevention: ['clean_water', 'proper_sanitation', 'hand_washing'],
        treatment: 'oral_rehydration',
        severity: 'medium',
        seasonal: ['all_year']
      },
      respiratory_infections: {
        name: 'Respiratory Infections',
        localNames: {
          'bem': 'Ukuuma',
          'ton': 'Kukosola',
          'nya': 'Chifuwa',
          'loz': 'Ho kofela'
        },
        symptoms: ['cough', 'difficulty_breathing', 'chest_pain'],
        prevention: ['good_ventilation', 'avoid_smoke', 'proper_nutrition'],
        treatment: 'medical_consultation',
        severity: 'medium',
        seasonal: ['dry_season']
      }
    }
    
    // Health monitoring metrics
    this.healthMetrics = {
      growth: {
        height: { unit: 'cm', frequency: 'monthly' },
        weight: { unit: 'kg', frequency: 'monthly' },
        bmi: { calculated: true, frequency: 'monthly' }
      },
      vital_signs: {
        temperature: { unit: '°C', normal_range: [36.1, 37.2] },
        pulse: { unit: 'bpm', normal_range: [60, 100] },
        blood_pressure: { unit: 'mmHg', age_dependent: true }
      },
      immunizations: {
        bcg: { age: '0-1_year', required: true },
        polio: { age: '0-5_years', doses: 4 },
        measles: { age: '9-15_months', required: true },
        dpt: { age: '0-5_years', doses: 3 }
      }
    }
    
    console.log('🏥 Health monitoring system initialized')
  }

  /**
   * Setup nutrition programs for school feeding
   */
  setupNutritionPrograms() {
    // School feeding program
    this.nutritionPrograms.set('school_feeding', {
      name: 'School Feeding Program',
      description: 'Daily nutritious meals for all students',
      meals: {
        breakfast: {
          time: '07:30',
          foods: ['porridge', 'milk', 'groundnuts'],
          calories: 300,
          cost_per_child: 2.50 // K2.50
        },
        lunch: {
          time: '12:00',
          foods: ['nsima', 'vegetables', 'beans', 'fish'],
          calories: 500,
          cost_per_child: 5.00 // K5.00
        }
      },
      nutritional_targets: {
        calories_per_day: 800,
        protein_grams: 25,
        vitamins: ['A', 'C', 'D', 'B12'],
        minerals: ['iron', 'calcium', 'zinc']
      },
      local_foods: {
        staples: ['maize', 'cassava', 'sweet_potatoes'],
        proteins: ['beans', 'groundnuts', 'fish', 'chicken'],
        vegetables: ['rape', 'cabbage', 'tomatoes', 'onions'],
        fruits: ['mangoes', 'bananas', 'oranges', 'papayas']
      }
    })
    
    // Nutrition education program
    this.nutritionPrograms.set('nutrition_education', {
      name: 'Nutrition Education',
      description: 'Teaching healthy eating habits and food preparation',
      curriculum: {
        grade1_3: {
          topics: ['food_groups', 'healthy_snacks', 'clean_eating'],
          activities: ['food_sorting', 'garden_visits', 'cooking_demos']
        },
        grade4_7: {
          topics: ['balanced_diet', 'food_safety', 'nutrition_diseases'],
          activities: ['meal_planning', 'nutrition_calculations', 'health_projects']
        }
      },
      community_outreach: {
        parent_workshops: 'monthly',
        cooking_demonstrations: 'weekly',
        nutrition_counseling: 'as_needed'
      }
    })
    
    // Emergency feeding program
    this.nutritionPrograms.set('emergency_feeding', {
      name: 'Emergency Feeding',
      description: 'Support during hunger season and emergencies',
      triggers: ['hunger_season', 'drought', 'flood', 'economic_crisis'],
      interventions: {
        take_home_rations: {
          frequency: 'weekly',
          contents: ['maize_meal', 'cooking_oil', 'beans', 'salt'],
          family_size: 'adjusted'
        },
        therapeutic_feeding: {
          target: 'malnourished_children',
          foods: ['ready_to_use_therapeutic_food', 'fortified_porridge'],
          monitoring: 'daily'
        }
      }
    })
    
    console.log('🍽️ Nutrition programs configured')
  }

  /**
   * Configure community health initiatives
   */
  configureCommunityHealth() {
    // Community health workers
    this.communityHealth.set('health_workers', {
      roles: [
        {
          title: 'Community Health Assistant',
          responsibilities: [
            'Basic health screening',
            'Health education',
            'Referral to clinics',
            'Immunization support'
          ],
          training: 'basic_health_training',
          coverage: '500_households'
        },
        {
          title: 'School Health Coordinator',
          responsibilities: [
            'Student health monitoring',
            'Health program coordination',
            'Emergency response',
            'Parent communication'
          ],
          training: 'school_health_specialization',
          coverage: '1_school'
        }
      ]
    })
    
    // Health education campaigns
    this.communityHealth.set('health_campaigns', {
      malaria_prevention: {
        frequency: 'quarterly',
        activities: [
          'Bed net distribution',
          'Drainage improvement',
          'Community clean-up',
          'Education sessions'
        ],
        target_audience: 'all_community_members'
      },
      hygiene_promotion: {
        frequency: 'monthly',
        activities: [
          'Hand washing demonstrations',
          'Latrine construction',
          'Water treatment education',
          'Personal hygiene training'
        ],
        target_audience: 'families_with_children'
      },
      nutrition_awareness: {
        frequency: 'bi_monthly',
        activities: [
          'Cooking demonstrations',
          'Garden establishment',
          'Food preservation training',
          'Breastfeeding support'
        ],
        target_audience: 'mothers_and_caregivers'
      }
    })
    
    // Health facility partnerships
    this.communityHealth.set('facility_partnerships', {
      rural_health_center: {
        distance: '15km',
        services: ['basic_medical_care', 'immunizations', 'maternal_health'],
        referral_protocol: 'serious_cases',
        transport: 'community_vehicle'
      },
      district_hospital: {
        distance: '45km',
        services: ['emergency_care', 'surgery', 'specialized_treatment'],
        referral_protocol: 'emergency_cases',
        transport: 'ambulance_or_private'
      },
      mobile_clinic: {
        frequency: 'monthly',
        services: ['routine_checkups', 'immunizations', 'health_education'],
        schedule: 'first_friday_of_month'
      }
    })
    
    console.log('🏘️ Community health initiatives configured')
  }

  /**
   * Load family support systems
   */
  loadFamilySupport() {
    // Family support programs
    this.familySupport.set('vulnerable_families', {
      identification_criteria: [
        'Single parent households',
        'Families with disabled members',
        'Households with chronic illness',
        'Extreme poverty indicators'
      ],
      support_services: {
        food_assistance: {
          type: 'monthly_food_parcels',
          contents: ['maize_meal', 'cooking_oil', 'beans', 'salt', 'sugar'],
          duration: '6_months_renewable'
        },
        healthcare_support: {
          type: 'subsidized_medical_care',
          coverage: ['clinic_fees', 'basic_medications', 'transport_to_clinic'],
          eligibility: 'means_tested'
        },
        education_support: {
          type: 'school_fee_assistance',
          coverage: ['tuition', 'uniforms', 'books', 'meals'],
          conditions: 'regular_attendance'
        }
      }
    })
    
    // Community support networks
    this.familySupport.set('community_networks', {
      savings_groups: {
        name: 'Village Savings and Loan Associations',
        purpose: 'Financial support and emergency funds',
        membership: '15-25_women',
        activities: ['weekly_savings', 'micro_loans', 'emergency_support']
      },
      care_groups: {
        name: 'Community Care Groups',
        purpose: 'Mutual support for child care and health',
        membership: '10-15_mothers',
        activities: ['health_education', 'child_care_sharing', 'nutrition_support']
      },
      youth_groups: {
        name: 'Youth Development Groups',
        purpose: 'Skills development and income generation',
        membership: '15-20_youth',
        activities: ['skills_training', 'income_projects', 'community_service']
      }
    })
    
    console.log('👨‍👩‍👧‍👦 Family support systems loaded')
  }

  /**
   * Record student health data
   */
  recordHealthData(studentId, healthData) {
    const {
      date,
      height,
      weight,
      temperature,
      symptoms,
      immunizations,
      notes
    } = healthData
    
    if (!this.healthRecords.has(studentId)) {
      this.healthRecords.set(studentId, {
        studentId,
        records: [],
        alerts: [],
        immunizationHistory: [],
        growthChart: []
      })
    }
    
    const studentHealth = this.healthRecords.get(studentId)
    
    // Calculate BMI if height and weight provided
    let bmi = null
    if (height && weight) {
      bmi = (weight / ((height / 100) ** 2)).toFixed(1)
    }
    
    const record = {
      id: this.generateRecordId(),
      date: new Date(date),
      measurements: {
        height,
        weight,
        bmi,
        temperature
      },
      symptoms: symptoms || [],
      immunizations: immunizations || [],
      notes: notes || '',
      recordedBy: 'school_health_coordinator'
    }
    
    studentHealth.records.push(record)
    
    // Update growth chart
    if (height && weight) {
      studentHealth.growthChart.push({
        date: new Date(date),
        height,
        weight,
        bmi
      })
    }
    
    // Check for health alerts
    this.checkHealthAlerts(studentId, record)
    
    console.log(`📊 Health data recorded for student ${studentId}`)
    
    return record
  }

  /**
   * Track nutrition intake
   */
  trackNutritionIntake(studentId, mealData) {
    const {
      date,
      meal_type, // breakfast, lunch, dinner
      foods_consumed,
      portion_sizes,
      calories_estimated
    } = mealData
    
    if (!this.nutritionTracking.has(studentId)) {
      this.nutritionTracking.set(studentId, {
        studentId,
        dailyIntake: new Map(),
        weeklyAverages: [],
        nutritionalStatus: 'unknown'
      })
    }
    
    const nutrition = this.nutritionTracking.get(studentId)
    const dateKey = new Date(date).toDateString()
    
    if (!nutrition.dailyIntake.has(dateKey)) {
      nutrition.dailyIntake.set(dateKey, {
        date: new Date(date),
        meals: {},
        totalCalories: 0,
        nutritionalValue: {}
      })
    }
    
    const dailyRecord = nutrition.dailyIntake.get(dateKey)
    
    dailyRecord.meals[meal_type] = {
      foods: foods_consumed,
      portions: portion_sizes,
      calories: calories_estimated,
      time: new Date()
    }
    
    // Update total calories
    dailyRecord.totalCalories += calories_estimated
    
    // Assess nutritional adequacy
    this.assessNutritionalAdequacy(studentId, dateKey)
    
    console.log(`🍽️ Nutrition intake tracked for student ${studentId}`)
    
    return dailyRecord
  }

  /**
   * Check for health alerts
   */
  checkHealthAlerts(studentId, healthRecord) {
    const alerts = []
    
    // Check temperature
    if (healthRecord.measurements.temperature > 37.5) {
      alerts.push({
        type: 'fever',
        severity: 'medium',
        message: 'Student has elevated temperature',
        action: 'monitor_and_notify_parents'
      })
    }
    
    // Check BMI
    if (healthRecord.measurements.bmi) {
      const bmi = parseFloat(healthRecord.measurements.bmi)
      if (bmi < 16) {
        alerts.push({
          type: 'severe_malnutrition',
          severity: 'high',
          message: 'Student shows signs of severe malnutrition',
          action: 'immediate_nutritional_intervention'
        })
      } else if (bmi < 18.5) {
        alerts.push({
          type: 'underweight',
          severity: 'medium',
          message: 'Student is underweight',
          action: 'nutritional_support_program'
        })
      }
    }
    
    // Check symptoms
    if (healthRecord.symptoms.includes('persistent_cough')) {
      alerts.push({
        type: 'respiratory_concern',
        severity: 'medium',
        message: 'Student has persistent cough',
        action: 'medical_evaluation_needed'
      })
    }
    
    // Store alerts
    if (alerts.length > 0) {
      const studentHealth = this.healthRecords.get(studentId)
      studentHealth.alerts.push(...alerts)
      
      // Send notifications
      this.sendHealthAlerts(studentId, alerts)
    }
  }

  /**
   * Assess nutritional adequacy
   */
  assessNutritionalAdequacy(studentId, dateKey) {
    const nutrition = this.nutritionTracking.get(studentId)
    const dailyRecord = nutrition.dailyIntake.get(dateKey)
    
    // Get recommended daily intake (simplified)
    const recommendedCalories = 1800 // For school-age children
    const calorieAdequacy = (dailyRecord.totalCalories / recommendedCalories) * 100
    
    let status = 'adequate'
    if (calorieAdequacy < 60) {
      status = 'severely_inadequate'
    } else if (calorieAdequacy < 80) {
      status = 'inadequate'
    } else if (calorieAdequacy > 120) {
      status = 'excessive'
    }
    
    dailyRecord.nutritionalValue = {
      calorieAdequacy: calorieAdequacy.toFixed(1),
      status,
      assessment_date: new Date()
    }
    
    // Update overall nutritional status
    this.updateNutritionalStatus(studentId)
  }

  /**
   * Update overall nutritional status
   */
  updateNutritionalStatus(studentId) {
    const nutrition = this.nutritionTracking.get(studentId)
    const recentRecords = Array.from(nutrition.dailyIntake.values())
      .slice(-7) // Last 7 days
    
    if (recentRecords.length === 0) return
    
    const averageAdequacy = recentRecords.reduce((sum, record) => {
      return sum + parseFloat(record.nutritionalValue?.calorieAdequacy || 0)
    }, 0) / recentRecords.length
    
    let overallStatus = 'adequate'
    if (averageAdequacy < 60) {
      overallStatus = 'at_risk'
    } else if (averageAdequacy < 80) {
      overallStatus = 'needs_attention'
    }
    
    nutrition.nutritionalStatus = overallStatus
    
    // Generate intervention recommendations if needed
    if (overallStatus !== 'adequate') {
      this.generateNutritionalInterventions(studentId, overallStatus)
    }
  }

  /**
   * Generate nutritional interventions
   */
  generateNutritionalInterventions(studentId, status) {
    const interventions = []
    
    switch (status) {
      case 'at_risk':
        interventions.push({
          type: 'emergency_feeding',
          description: 'Enroll in emergency feeding program',
          duration: '3_months',
          monitoring: 'weekly'
        })
        interventions.push({
          type: 'family_support',
          description: 'Provide family with food assistance',
          duration: '6_months',
          monitoring: 'monthly'
        })
        break
        
      case 'needs_attention':
        interventions.push({
          type: 'enhanced_school_feeding',
          description: 'Additional nutritious snacks',
          duration: '2_months',
          monitoring: 'bi_weekly'
        })
        interventions.push({
          type: 'nutrition_education',
          description: 'Family nutrition counseling',
          duration: '1_month',
          monitoring: 'weekly'
        })
        break
    }
    
    // Store interventions
    const nutrition = this.nutritionTracking.get(studentId)
    nutrition.interventions = interventions
    
    console.log(`🎯 Nutritional interventions generated for student ${studentId}`)
  }

  /**
   * Send health alerts
   */
  async sendHealthAlerts(studentId, alerts) {
    for (const alert of alerts) {
      // Send SMS to parents if available
      if (window.smsSystem) {
        const message = this.generateHealthAlertMessage(studentId, alert)
        // Get parent phone number from student records
        const parentPhone = await this.getParentPhoneNumber(studentId)
        
        if (parentPhone) {
          await window.smsSystem.sendSMS(parentPhone, message, 'health_alert', 'high')
        }
      }
      
      // Log alert for school health coordinator
      this.healthAlerts.push({
        studentId,
        alert,
        timestamp: new Date(),
        status: 'pending_action'
      })
    }
  }

  /**
   * Generate health alert message
   */
  generateHealthAlertMessage(studentId, alert) {
    const language = window.languageSystem?.currentLanguage || 'en'
    
    const messages = {
      'fever': {
        'en': `Health Alert: Your child has elevated temperature. Please monitor and consider medical consultation.`,
        'bem': `Ubulwele: Umwana wenu ali ne temperature yakulya. Mwamone bwino.`,
        'ton': `Bulwazi: Mwana wanu uli ne temperature yakukula. Muboneni bwino.`,
        'nya': `Matenda: Mwana wanu ali ndi kutentha kwambiri. Muyanganirani bwino.`
      },
      'severe_malnutrition': {
        'en': `Urgent: Your child shows signs of severe malnutrition. Please visit the health center immediately.`,
        'bem': `Cakufwaikisha: Umwana wenu aliko ne nzala yakulya. Muyeni ku clinic nomba.`,
        'ton': `Cakufwaikisha: Mwana wanu uli ne nzala yakukula. Muyeni ku clinic lino.`,
        'nya': `Chadzidzidzi: Mwana wanu ali ndi njala yayikulu. Pitani ku chipatala msanga.`
      }
    }
    
    const alertMessages = messages[alert.type]
    return alertMessages?.[language] || alertMessages?.['en'] || `Health alert for your child: ${alert.message}`
  }

  /**
   * Generate health report
   */
  generateHealthReport(period = 'monthly') {
    const now = new Date()
    let startDate
    
    switch (period) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'termly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1)
    }
    
    const report = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      healthMetrics: this.calculateHealthMetrics(startDate),
      nutritionMetrics: this.calculateNutritionMetrics(startDate),
      alerts: this.getAlertsInPeriod(startDate),
      interventions: this.getInterventionsInPeriod(startDate),
      recommendations: this.generateHealthRecommendations()
    }
    
    return report
  }

  /**
   * Get health and nutrition statistics
   */
  getHealthNutritionStats() {
    const totalStudents = this.healthRecords.size
    const studentsWithNutritionData = this.nutritionTracking.size
    
    // Calculate health statistics
    let healthyStudents = 0
    let studentsWithAlerts = 0
    
    for (const [studentId, health] of this.healthRecords) {
      if (health.alerts.length === 0) {
        healthyStudents++
      } else {
        studentsWithAlerts++
      }
    }
    
    // Calculate nutrition statistics
    let wellNourishedStudents = 0
    let atRiskStudents = 0
    
    for (const [studentId, nutrition] of this.nutritionTracking) {
      if (nutrition.nutritionalStatus === 'adequate') {
        wellNourishedStudents++
      } else {
        atRiskStudents++
      }
    }
    
    return {
      totalStudents,
      healthMetrics: {
        healthyStudents,
        studentsWithAlerts,
        healthyPercentage: totalStudents > 0 ? (healthyStudents / totalStudents * 100).toFixed(1) : 0
      },
      nutritionMetrics: {
        studentsWithNutritionData,
        wellNourishedStudents,
        atRiskStudents,
        wellNourishedPercentage: studentsWithNutritionData > 0 ? 
          (wellNourishedStudents / studentsWithNutritionData * 100).toFixed(1) : 0
      },
      activeAlerts: this.healthAlerts.filter(alert => alert.status === 'pending_action').length,
      feedingProgramParticipants: this.getFeedingProgramParticipants(),
      communityHealthWorkers: this.getCommunityHealthWorkerCount()
    }
  }

  // Helper methods
  generateRecordId() {
    return `HEALTH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async getParentPhoneNumber(studentId) {
    // Placeholder - implement with actual student data
    return '+260977123456'
  }

  calculateHealthMetrics(startDate) {
    // Implementation for health metrics calculation
    return {}
  }

  calculateNutritionMetrics(startDate) {
    // Implementation for nutrition metrics calculation
    return {}
  }

  getAlertsInPeriod(startDate) {
    return this.healthAlerts.filter(alert => 
      new Date(alert.timestamp) >= startDate
    )
  }

  getInterventionsInPeriod(startDate) {
    // Implementation for interventions in period
    return []
  }

  generateHealthRecommendations() {
    return [
      'Continue regular health screenings',
      'Enhance nutrition education programs',
      'Strengthen community health partnerships',
      'Improve access to clean water and sanitation'
    ]
  }

  getFeedingProgramParticipants() {
    // Implementation for feeding program participants count
    return 0
  }

  getCommunityHealthWorkerCount() {
    // Implementation for community health worker count
    return 2
  }
}

// Export singleton instance
export const healthNutritionSystem = new HealthNutritionSystem()
