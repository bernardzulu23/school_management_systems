import { canUseFeatureByLevel, canUseFeatureByOwnership } from '@/lib/school/schoolTypeHelpers'

export const SCHOOL_LEVELS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  COMBINED: 'combined',
}

export const GRADE_LEVELS = {
  ECE: { name: 'ECE', level: 'primary', phase: 'foundation', age: 4 },
  RECEPTION: { name: 'Reception', level: 'primary', phase: 'foundation', age: 5 },
  G1: { name: 'Grade 1', level: 'primary', phase: 'foundation', age: 6 },
  G2: { name: 'Grade 2', level: 'primary', phase: 'foundation', age: 7 },
  G3: { name: 'Grade 3', level: 'primary', phase: 'foundation', age: 8 },
  G4: { name: 'Grade 4', level: 'primary', phase: 'foundation', age: 9 },
  G5: { name: 'Grade 5', level: 'primary', phase: 'upper', age: 10 },
  G6: { name: 'Grade 6', level: 'primary', phase: 'upper', age: 11 },
  G7: { name: 'Grade 7', level: 'primary', phase: 'upper', age: 12 },
  G10: { name: 'Grade 10', level: 'secondary', phase: 'upper', age: 15 },
  G11: { name: 'Grade 11', level: 'secondary', phase: 'upper', age: 16 },
  G12: { name: 'Grade 12', level: 'secondary', phase: 'upper', age: 17 },
}

export const PRIMARY_ONLY_FEATURES = {
  'phonics-trainer': {
    name: 'Phonics & Letter Recognition',
    grades: ['G1', 'G2', 'G3', 'G4'],
    description: 'AI-powered phonics training with sound recognition for early literacy',
    zambian_relevance: 'Supports CBC foundation phase literacy',
  },
  'number-bonds': {
    name: 'Number Bonds & Counting',
    grades: ['G1', 'G2', 'G3', 'G4'],
    description: 'Interactive number bonds, subitizing, and counting activities',
    zambian_relevance: 'CBC numeracy foundation',
  },
  'early-writing-support': {
    name: 'Handwriting & Mark-Making',
    grades: ['G1', 'G2', 'G3', 'G4'],
    description: 'Pencil grip guides, letter formation, fine motor development',
    zambian_relevance: 'Pre-writing and writing readiness',
  },
  'life-skills-curriculum': {
    name: 'Life Skills Curriculum Tracker',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Track CBC Life Skills competencies: Personal, Social, Environment',
    zambian_relevance: 'CBC Subject - mandatory in all Zambian primary schools',
    cbc_subject: true,
  },
  'values-education': {
    name: 'Values & Citizenship Education',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Track citizenship values: respect, responsibility, patriotism',
    zambian_relevance: 'Zambian national curriculum emphasis',
  },
  'english-phonic-stages': {
    name: 'English Phonics Stages Tracker',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Track Jolly Phonics or similar synthetic phonics progression',
    zambian_relevance: 'Most Zambian primary schools use phonics-based literacy',
  },
  'singapore-math-tracker': {
    name: 'Singapore Math/CPA Methods Tracker',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Track Concrete-Pictorial-Abstract (CPA) progression',
    zambian_relevance: 'CBC numeracy approach, popular in Zambian schools',
  },
  'environmental-science-projects': {
    name: 'Environmental Projects & Gardens',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Manage school gardens, nature projects, environmental competencies',
    zambian_relevance: 'CBC emphasis on environmental awareness',
  },
  'movement-coordination-tracker': {
    name: 'Movement & Coordination Development',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Track gross and fine motor development milestones',
    zambian_relevance: 'Primary PE focus in CBC',
  },
  'creative-arts-portfolio': {
    name: 'Creative Arts Portfolio System',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Digital portfolio for art, music, drama, dance work',
    zambian_relevance: 'CBC Creative and Performing Arts subject',
  },
  'cbc-competency-tracker': {
    name: 'CBC Competency Progress Tracking',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Track CBC core competencies: critical thinking, creativity, collaboration',
    zambian_relevance: '**CRITICAL** - Zambian curriculum since 2022',
  },
  'continuous-assessment-tool': {
    name: 'Continuous Assessment Tool',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Formative assessment records, observation checklists',
    zambian_relevance: 'Replaces traditional exams in primary, part of CBC',
  },
  'parent-report-cards-primary': {
    name: 'Primary-Focused Report Cards',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Report cards emphasizing progress, behavior, competencies (not just grades)',
    zambian_relevance: 'CBC assessment reporting format',
  },
  'childhood-welfare-monitoring': {
    name: 'Child Safeguarding & Welfare',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Track health screenings, nutrition, abuse reporting, orphan support',
    zambian_relevance: 'Zambian government requirement for primary schools',
  },
  'nutrition-feeding-program': {
    name: 'School Feeding Program Tracker',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Manage meal distributions, menus, nutrition records',
    zambian_relevance: 'WFP (World Food Program) supported in many Zambian primaries',
  },
  'wash-facilities-tracker': {
    name: 'WASH Facilities Monitoring',
    grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
    description: 'Water, Sanitation, Hygiene facility inspections and maintenance',
    zambian_relevance: 'Key education quality metric in Zambia',
  },
}

export const OWNERSHIP_GATED_FEATURES = {
  'fee-management': {
    label: 'Fee management',
    description: 'Student invoicing, payment tracking, receipts',
    availableFor: ['private'],
  },
}

export const ZAMBIA_FEATURES = {
  'ecz-exam-tracking': {
    name: 'ECZ Exam Tracking & Analytics',
    levels: ['secondary'],
    description: 'Track ECZ GCSE performance, question analysis, trend reporting',
    zambian_relevance: 'Examinations Council of Zambia - mandatory for Grade 12',
  },
  'moe-compliance-reporting': {
    name: 'MOE Compliance & Reporting',
    levels: ['primary', 'secondary'],
    description: 'Generate Ministry of Education reports, enrollment data, staffing',
    zambian_relevance: 'Required reporting for all Zambian registered schools',
  },
  'cbc-curriculum-mapper': {
    name: 'CBC Curriculum Mapper',
    levels: ['primary', 'secondary'],
    description: 'Map lessons to CBC standards and competencies',
    zambian_relevance: 'Competency-Based Curriculum framework (2022+)',
  },
  'english-second-language-tracking': {
    name: 'English as Second Language (ESL)',
    levels: ['primary', 'secondary'],
    description: 'ESL proficiency tracking for schools in local language areas',
    zambian_relevance: 'Many Zambian schools teach in local languages G1-G4',
  },
  'local-language-subjects': {
    name: 'Local Language Subject Management',
    levels: ['primary'],
    description: 'Bemba, Tonga, Lozi, Kaonde, Lunda curriculum tracking',
    zambian_relevance: 'G1-G4 taught in local languages per MOE policy',
  },
  'school-fees-management': {
    name: 'School Fees & Payment Tracking',
    levels: ['primary', 'secondary'],
    description: 'Fee structures, payment tracking, exemption management',
    zambian_relevance: 'Critical for school sustainability in Zambia',
  },
  'teacher-deployment-system': {
    name: 'Teacher Deployment & Transfers',
    levels: ['primary', 'secondary'],
    description: 'Manage teacher transfers, postings, qualifications',
    zambian_relevance: 'MOE teacher deployment coordination',
  },
  'infrastructure-mapping': {
    name: 'School Infrastructure Asset Mapping',
    levels: ['primary', 'secondary'],
    description: 'Classroom inventory, furniture, equipment tracking',
    zambian_relevance: 'EMIS (Education Management Information System) reporting',
  },
  'hiv-awareness-program': {
    name: 'HIV/AIDS Awareness Program',
    levels: ['primary', 'secondary'],
    description: 'Curriculum tracking, testing data, support programs',
    zambian_relevance: 'National priority in Zambian schools',
  },
  'student-health-records': {
    name: 'Student Health Records System',
    levels: ['primary', 'secondary'],
    description: 'Medical history, vaccinations, health screening records',
    zambian_relevance: 'Health ministry coordination',
  },
  'community-liaison-system': {
    name: 'Community Liaison & PTA Management',
    levels: ['primary', 'secondary'],
    description: 'Parent-Teacher Association (PTA) meetings, decisions, fundraising',
    zambian_relevance: 'Critical governance structure in Zambian schools',
  },
  'local-partner-network': {
    name: 'Local Partner Network Coordination',
    levels: ['primary', 'secondary'],
    description: 'Manage NGO partnerships, donor programs, community resources',
    zambian_relevance: 'Many Zambian schools rely on local NGO support',
  },
}

/** Features hidden for primary schools (ECE–Grade 7). */
export const SECONDARY_ONLY_FEATURES = {
  'hod-dashboard': {
    name: 'HOD Dashboard',
    levels: ['secondary', 'combined'],
  },
  'hod-management': {
    name: 'HOD Management',
    levels: ['secondary', 'combined'],
  },
  'basic-results': {
    name: 'Secondary Results & Grading',
    levels: ['secondary', 'combined'],
  },
  'junior-performance': {
    name: 'Junior Performance Analytics',
    levels: ['secondary', 'combined'],
  },
  'ecz-tracking': {
    name: 'ECZ Exam Tracking',
    levels: ['secondary', 'combined'],
  },
  'ecz-practice': {
    name: 'ECZ Practice',
    levels: ['secondary', 'combined'],
  },
  'ai-tools': {
    name: 'AI Tools',
    levels: ['primary', 'secondary', 'combined'],
  },
}

export const PLAN_FEATURES = {
  basic: [
    'attendance',
    'students',
    'teachers',
    'classes',
    'subjects',
    'basic-results',
    'headteacher-dashboard',
    'teacher-dashboard',
    'student-dashboard',
    'user-management',
    'email-support',
    'moe-compliance-reporting',
    'inter-house',
    'ai-tools',
  ],
  standard: [
    'attendance',
    'students',
    'teachers',
    'classes',
    'subjects',
    'basic-results',
    'headteacher-dashboard',
    'teacher-dashboard',
    'student-dashboard',
    'user-management',
    'email-support',
    'moe-compliance-reporting',
    'hod-dashboard',
    'junior-performance',
    'ecz-tracking',
    'moe-reports',
    'emis-export',
    'grants-tracking',
    'gender-report',
    'teacher-leave',
    'teacher-deployment',
    'inter-house',
    'stem-monitoring',
    'girls-dropout-tracking',
    'export-reports',
    'ai-story-weaver',
    'ai-lesson-planner',
    'ai-quiz-maker',
    'ai-tools',
    'ecz-practice',
    'interactive-whiteboard',
    'virtual-science-lab',
    'code-playground',
    'sms-alerts',
    'bulk-announcements',
    'hod-management',
    'timetable',
    'whatsapp-support',
    'onboarding',
    'data-backup',
    'ai-requests-50',
    'cbc-curriculum-mapper',
    'english-phonic-stages',
    'ecz-exam-tracking',
    'school-fees-management',
    'fee-management',
    'teacher-deployment-system',
    'student-health-records',
    'community-liaison-system',
  ],
  premium: [
    'attendance',
    'students',
    'teachers',
    'classes',
    'subjects',
    'basic-results',
    'headteacher-dashboard',
    'teacher-dashboard',
    'student-dashboard',
    'user-management',
    'email-support',
    'moe-compliance-reporting',
    'hod-dashboard',
    'junior-performance',
    'ecz-tracking',
    'moe-reports',
    'emis-export',
    'grants-tracking',
    'gender-report',
    'teacher-leave',
    'teacher-deployment',
    'inter-house',
    'stem-monitoring',
    'girls-dropout-tracking',
    'export-reports',
    'ai-story-weaver',
    'ai-lesson-planner',
    'ai-quiz-maker',
    'ai-tools',
    'ecz-practice',
    'interactive-whiteboard',
    'virtual-science-lab',
    'code-playground',
    'sms-alerts',
    'bulk-announcements',
    'hod-management',
    'timetable',
    'whatsapp-support',
    'onboarding',
    'data-backup',
    'ai-requests-50',
    'cbc-curriculum-mapper',
    'english-phonic-stages',
    'ecz-exam-tracking',
    'school-fees-management',
    'fee-management',
    'teacher-deployment-system',
    'student-health-records',
    'community-liaison-system',
    'predictive-analytics',
    'comprehensive-analytics',
    'ai-report-comments',
    'ai-requests-unlimited',
    'digital-music-composer',
    '3d-shape-builder',
    'automated-messaging',
    'strategic-planning',
    'blockchain-certificates',
    'custom-branding',
    'priority-support',
    'ecz-exam-tracking',
    'local-language-subjects',
    'hiv-awareness-program',
    'infrastructure-mapping',
    'local-partner-network',
    ...Object.keys(PRIMARY_ONLY_FEATURES),
  ],
  individual: [
    'teacher-dashboard',
    'student-dashboard',
    'students',
    'classes',
    'subjects',
    'basic-results',
    'ecz-practice',
    'ecz-tracking',
    'ecz-exam-tracking',
    'interactive-whiteboard',
    'virtual-science-lab',
    'code-playground',
    'email-support',
    'onboarding',
    'attendance',
    'export-reports',
  ],
  individual_free: [
    'teacher-dashboard',
    'student-dashboard',
    'students',
    'classes',
    'subjects',
    'basic-results',
    'ecz-practice',
    'ecz-tracking',
    'ecz-exam-tracking',
    'interactive-whiteboard',
    'virtual-science-lab',
    'code-playground',
    'email-support',
    'onboarding',
    'attendance',
    'export-reports',
  ],
  individual_premium: [
    'teacher-dashboard',
    'student-dashboard',
    'students',
    'classes',
    'subjects',
    'basic-results',
    'ecz-practice',
    'interactive-whiteboard',
    'virtual-science-lab',
    'code-playground',
    'email-support',
    'onboarding',
    'attendance',
    'export-reports',
    'ai-story-weaver',
    'ai-lesson-planner',
    'ai-quiz-maker',
    'ai-report-comments',
    'ai-requests-50',
  ],
  individual_annual: [
    'teacher-dashboard',
    'student-dashboard',
    'students',
    'classes',
    'subjects',
    'basic-results',
    'ecz-practice',
    'interactive-whiteboard',
    'virtual-science-lab',
    'code-playground',
    'email-support',
    'onboarding',
    'attendance',
    'export-reports',
    'ai-story-weaver',
    'ai-lesson-planner',
    'ai-quiz-maker',
    'ai-report-comments',
    'ai-requests-unlimited',
  ],
}

export function planIncludes(schoolPlan, featureId, school = null) {
  const plan = schoolPlan?.toLowerCase() || 'basic'
  const onTrial = school?.trialEndsAt && new Date(school.trialEndsAt).getTime() > Date.now()
  if (plan === 'premium' || plan === 'trial' || onTrial) return true

  if (plan === 'individual_premium' || plan === 'individual_annual') {
    const features =
      plan === 'individual_annual'
        ? PLAN_FEATURES.individual_annual
        : PLAN_FEATURES.individual_premium
    return [...PLAN_FEATURES.individual, ...features].includes(featureId)
  }

  if (plan === 'individual' || plan === 'individual_free') {
    return PLAN_FEATURES.individual.includes(featureId)
  }

  if (plan === 'standard') {
    return [...PLAN_FEATURES.basic, ...PLAN_FEATURES.standard].includes(featureId)
  }

  return PLAN_FEATURES.basic.includes(featureId)
}

export function canUseFeature(schoolLevel, featureId) {
  return canUseFeatureByLevel(schoolLevel, featureId)
}

function normalizeOwnershipKey(ownershipType) {
  return String(ownershipType || 'PRIVATE')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, '')
}

export function resolveOwnershipFeatureId(featureId) {
  const id = String(featureId || '').trim()
  if (id === 'school-fees-management') return 'fee-management'
  return id
}

export function canUseFeatureForOwnership(ownershipType, featureId) {
  return canUseFeatureByOwnership(ownershipType, featureId)
}

export function getAvailableFeaturesForSchool(schoolPlan, schoolLevel) {
  const planFeatures = PLAN_FEATURES[schoolPlan?.toLowerCase()] || PLAN_FEATURES.basic
  const level = String(schoolLevel || 'combined').toLowerCase()

  if (level === 'secondary') {
    return planFeatures.filter((f) => !PRIMARY_ONLY_FEATURES[f])
  }

  if (level === 'primary') {
    return planFeatures.filter((f) => !SECONDARY_ONLY_FEATURES[f])
  }

  return planFeatures
}
