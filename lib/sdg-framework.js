// 🇺🇳 UN Sustainable Development Goals Framework for Zambian School Management System
// Comprehensive SDG integration and tracking system

export const SDG_GOALS = {
  SDG1: {
    id: 1,
    title: "No Poverty",
    description: "End poverty in all its forms everywhere",
    color: "#E5243B",
    icon: "🏚️",
    targets: [
      "Eradicate extreme poverty",
      "Reduce poverty by at least 50%",
      "Implement social protection systems",
      "Equal rights to economic resources"
    ],
    metrics: [
      "students_below_poverty_line",
      "scholarship_recipients",
      "fee_assistance_provided",
      "family_income_levels"
    ]
  },
  SDG2: {
    id: 2,
    title: "Zero Hunger",
    description: "End hunger, achieve food security and improved nutrition",
    color: "#DDA63A",
    icon: "🍽️",
    targets: [
      "End hunger and malnutrition",
      "Double agricultural productivity",
      "Ensure sustainable food systems",
      "Maintain genetic diversity"
    ],
    metrics: [
      "students_receiving_meals",
      "nutrition_status",
      "food_security_index",
      "agricultural_education_participation"
    ]
  },
  SDG3: {
    id: 3,
    title: "Good Health and Well-being",
    description: "Ensure healthy lives and promote well-being for all",
    color: "#4C9F38",
    icon: "🏥",
    targets: [
      "Reduce maternal mortality",
      "End preventable deaths",
      "Combat communicable diseases",
      "Promote mental health"
    ],
    metrics: [
      "vaccination_coverage",
      "health_checkup_completion",
      "mental_health_support_access",
      "health_education_participation"
    ]
  },
  SDG4: {
    id: 4,
    title: "Quality Education",
    description: "Ensure inclusive and equitable quality education",
    color: "#C5192D",
    icon: "🎓",
    targets: [
      "Universal primary and secondary education",
      "Equal access to quality education",
      "Increase literacy and numeracy",
      "Promote lifelong learning"
    ],
    metrics: [
      "enrollment_rates",
      "completion_rates",
      "literacy_rates",
      "teacher_student_ratio"
    ]
  },
  SDG5: {
    id: 5,
    title: "Gender Equality",
    description: "Achieve gender equality and empower all women and girls",
    color: "#FF3A21",
    icon: "👩‍🎓",
    targets: [
      "End discrimination against women",
      "Eliminate violence against women",
      "Ensure equal participation",
      "Equal rights to economic resources"
    ],
    metrics: [
      "gender_parity_index",
      "female_teacher_percentage",
      "girls_completion_rate",
      "leadership_positions_by_gender"
    ]
  },
  SDG6: {
    id: 6,
    title: "Clean Water and Sanitation",
    description: "Ensure availability and sustainable management of water",
    color: "#26BDE2",
    icon: "💧",
    targets: [
      "Universal access to safe water",
      "Access to sanitation and hygiene",
      "Improve water quality",
      "Protect water-related ecosystems"
    ],
    metrics: [
      "water_access_percentage",
      "sanitation_facilities_quality",
      "hygiene_education_coverage",
      "water_quality_index"
    ]
  },
  SDG7: {
    id: 7,
    title: "Affordable and Clean Energy",
    description: "Ensure access to affordable, reliable, sustainable energy",
    color: "#FCC30B",
    icon: "⚡",
    targets: [
      "Universal access to modern energy",
      "Increase renewable energy share",
      "Double energy efficiency",
      "Enhance international cooperation"
    ],
    metrics: [
      "renewable_energy_percentage",
      "energy_efficiency_score",
      "power_availability_hours",
      "solar_system_performance"
    ]
  },
  SDG8: {
    id: 8,
    title: "Decent Work and Economic Growth",
    description: "Promote sustained, inclusive economic growth",
    color: "#A21942",
    icon: "💼",
    targets: [
      "Sustain economic growth",
      "Achieve full employment",
      "Promote entrepreneurship",
      "Eradicate forced labor"
    ],
    metrics: [
      "vocational_training_completion",
      "employment_preparation_score",
      "entrepreneurship_education",
      "skills_development_participation"
    ]
  },
  SDG9: {
    id: 9,
    title: "Industry, Innovation and Infrastructure",
    description: "Build resilient infrastructure, promote innovation",
    color: "#FD6925",
    icon: "🏗️",
    targets: [
      "Develop reliable infrastructure",
      "Promote inclusive industrialization",
      "Foster innovation",
      "Increase access to ICT"
    ],
    metrics: [
      "ict_access_percentage",
      "innovation_projects_count",
      "infrastructure_quality_score",
      "technology_integration_level"
    ]
  },
  SDG10: {
    id: 10,
    title: "Reduced Inequalities",
    description: "Reduce inequality within and among countries",
    color: "#DD1367",
    icon: "⚖️",
    targets: [
      "Reduce income inequalities",
      "Promote social inclusion",
      "Ensure equal opportunity",
      "Facilitate migration and mobility"
    ],
    metrics: [
      "inclusion_index",
      "equal_opportunity_score",
      "diversity_representation",
      "accessibility_compliance"
    ]
  },
  SDG11: {
    id: 11,
    title: "Sustainable Cities and Communities",
    description: "Make cities and human settlements inclusive and sustainable",
    color: "#FD9D24",
    icon: "🏘️",
    targets: [
      "Ensure access to housing",
      "Provide sustainable transport",
      "Enhance inclusive urbanization",
      "Protect cultural heritage"
    ],
    metrics: [
      "community_development_projects",
      "sustainable_transport_access",
      "cultural_preservation_activities",
      "inclusive_planning_participation"
    ]
  },
  SDG12: {
    id: 12,
    title: "Responsible Consumption and Production",
    description: "Ensure sustainable consumption and production patterns",
    color: "#BF8B2E",
    icon: "♻️",
    targets: [
      "Implement sustainable consumption",
      "Achieve sustainable management",
      "Reduce food waste",
      "Manage chemicals and waste"
    ],
    metrics: [
      "waste_reduction_percentage",
      "recycling_rate",
      "sustainable_practices_adoption",
      "resource_efficiency_score"
    ]
  },
  SDG13: {
    id: 13,
    title: "Climate Action",
    description: "Take urgent action to combat climate change",
    color: "#3F7E44",
    icon: "🌍",
    targets: [
      "Strengthen resilience to climate hazards",
      "Integrate climate measures",
      "Improve education on climate",
      "Implement climate commitments"
    ],
    metrics: [
      "climate_education_coverage",
      "carbon_footprint_reduction",
      "climate_adaptation_measures",
      "environmental_monitoring_data"
    ]
  },
  SDG14: {
    id: 14,
    title: "Life Below Water",
    description: "Conserve and sustainably use oceans and marine resources",
    color: "#0A97D9",
    icon: "🌊",
    targets: [
      "Reduce marine pollution",
      "Protect marine ecosystems",
      "Minimize ocean acidification",
      "Regulate fishing"
    ],
    metrics: [
      "marine_education_participation",
      "water_conservation_practices",
      "aquatic_ecosystem_knowledge",
      "sustainable_fishing_awareness"
    ]
  },
  SDG15: {
    id: 15,
    title: "Life on Land",
    description: "Protect, restore and promote sustainable use of ecosystems",
    color: "#56C02B",
    icon: "🌳",
    targets: [
      "Conserve forest ecosystems",
      "Combat desertification",
      "Halt biodiversity loss",
      "Protect endangered species"
    ],
    metrics: [
      "biodiversity_education_coverage",
      "conservation_project_participation",
      "ecosystem_monitoring_activities",
      "environmental_stewardship_score"
    ]
  },
  SDG16: {
    id: 16,
    title: "Peace, Justice and Strong Institutions",
    description: "Promote peaceful and inclusive societies",
    color: "#00689D",
    icon: "⚖️",
    targets: [
      "Reduce violence everywhere",
      "Promote rule of law",
      "Develop effective institutions",
      "Ensure inclusive decision-making"
    ],
    metrics: [
      "conflict_resolution_training",
      "civic_education_participation",
      "digital_citizenship_score",
      "governance_education_coverage"
    ]
  },
  SDG17: {
    id: 17,
    title: "Partnerships for the Goals",
    description: "Strengthen means of implementation and partnerships",
    color: "#19486A",
    icon: "🤝",
    targets: [
      "Strengthen domestic resource mobilization",
      "Enhance international cooperation",
      "Promote effective partnerships",
      "Support capacity building"
    ],
    metrics: [
      "partnership_projects_count",
      "international_collaboration",
      "capacity_building_programs",
      "knowledge_sharing_activities"
    ]
  }
}

// SDG Progress Calculation Functions
export const calculateSDGProgress = (sdgId, metrics) => {
  const goal = SDG_GOALS[`SDG${sdgId}`]
  if (!goal) return 0

  const totalMetrics = goal.metrics.length
  let completedMetrics = 0

  goal.metrics.forEach(metric => {
    if (metrics[metric] && metrics[metric] > 0) {
      completedMetrics++
    }
  })

  return Math.round((completedMetrics / totalMetrics) * 100)
}

export const getSDGColor = (sdgId) => {
  return SDG_GOALS[`SDG${sdgId}`]?.color || '#666666'
}

export const getSDGIcon = (sdgId) => {
  return SDG_GOALS[`SDG${sdgId}`]?.icon || '🎯'
}

export const getAllApplicableSDGs = () => {
  // Return all SDGs that are applicable to school management
  return Object.keys(SDG_GOALS).map(key => SDG_GOALS[key])
}

export const getSDGsByCategory = () => {
  return {
    social: [1, 2, 3, 4, 5, 10, 16],
    environmental: [6, 7, 12, 13, 14, 15],
    economic: [8, 9, 11, 17]
  }
}
