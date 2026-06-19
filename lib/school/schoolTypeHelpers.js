/**
 * ZSMS School Type Helpers
 * Single source of truth for feature gating by school level and ownership.
 * Uses School.level (primary|secondary|combined) and School.ownershipType (not schoolType).
 */

function normalizeLevel(level) {
  return String(level || 'combined')
    .trim()
    .toLowerCase()
}

function normalizeOwnership(ownershipType) {
  return String(ownershipType || 'PRIVATE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z_]/g, '')
}

// ─── School ownership type ───────────────────────────────────────────────────

/** Government-funded school (free education policy applies) */
export function isGovernment(school) {
  const key = normalizeOwnership(school?.ownershipType)
  return key === 'GOVERNMENT' || key === 'COMMUNITY'
}

/** Fee-charging private school */
export function isPrivate(school) {
  const key = normalizeOwnership(school?.ownershipType)
  return key === 'PRIVATE' || key === 'GRANT_AIDED'
}

/** @param {string} ownershipType */
export function isGovernmentSchool(ownershipType) {
  return isGovernment({ ownershipType })
}

/** @param {string} ownershipType */
export function isPrivateSchool(ownershipType) {
  return isPrivate({ ownershipType })
}

export const GOVERNMENT_ONLY_FEATURES = [
  'emis-export',
  'grants-tracking',
  'gender-report',
  'teacher-leave',
  'teacher-deployment',
]

// ─── School level ────────────────────────────────────────────────────────────

/** Only ECE–Grade 7 (no secondary classes at all) */
export function isPrimaryOnly(school) {
  return normalizeLevel(school?.level) === 'primary'
}

/** Only Form 1–Grade 12 (no primary classes) */
export function isSecondaryOnly(school) {
  return normalizeLevel(school?.level) === 'secondary'
}

/** Has both primary (ECE–G7) AND secondary (F1–G12) classes */
export function isCombined(school) {
  return normalizeLevel(school?.level) === 'combined'
}

/** Has ANY secondary classes (secondary or combined) */
export function hasSecondaryClasses(school) {
  return isSecondaryOnly(school) || isCombined(school)
}

/** Has ANY primary classes (primary or combined) */
export function hasPrimaryClasses(school) {
  return isPrimaryOnly(school) || isCombined(school)
}

// ─── Curriculum feature access ───────────────────────────────────────────────

export function canUseCBC(school) {
  return hasPrimaryClasses(school)
}

export function canUseECZSBA(school) {
  return hasSecondaryClasses(school)
}

export function canUseECZExamTracking(school) {
  return hasSecondaryClasses(school)
}

export function canUseSecondaryGrading(school) {
  return hasSecondaryClasses(school)
}

export function canUseHOD(school) {
  return hasSecondaryClasses(school)
}

export function canUsePhonics(school) {
  return hasPrimaryClasses(school)
}

export function canUseCompetencyAnalyser(school) {
  return hasPrimaryClasses(school)
}

export function canUseMockExams(school) {
  return hasSecondaryClasses(school)
}

export function canUseCodePlayground(school) {
  return hasSecondaryClasses(school)
}

export function canUseCareerGuidance(school) {
  return hasSecondaryClasses(school)
}

export function canUseHostel(school) {
  return hasSecondaryClasses(school)
}

export function canUseStudyAssistant() {
  return true
}

// ─── Finance feature access ──────────────────────────────────────────────────

export function canUseFeeManagement(school) {
  return isPrivate(school)
}

export function canUseParentPortal(school) {
  return isPrivate(school)
}

export function canUseProprietorDashboard(school) {
  return isPrivate(school)
}

export function canUseSiblingDiscounts(school) {
  return isPrivate(school)
}

// ─── Government-only features ────────────────────────────────────────────────

export function canUseEMISExport(school) {
  return isGovernment(school)
}

export function canUseGrantsTracking(school) {
  return isGovernment(school)
}

export function canUseGenderReport(school) {
  return isGovernment(school)
}

export function canUseTeacherDeployment(school) {
  return isGovernment(school)
}

export function canUseTeacherLeave(school) {
  return isGovernment(school)
}

// ─── Universal features (all school types) ──────────────────────────────────

export const UNIVERSAL_FEATURES = [
  'attendance',
  'timetable',
  'lesson-plans',
  'sms-broadcast',
  'parent-sms',
  'results-basic',
  'term-reports',
  'ai-lesson-planner',
  'ai-quiz-maker',
  'ai-story-weaver',
  'rag-upload',
  'games',
  'stem-monitoring',
  'activities',
  'marketplace',
  'virtual-lab',
  'events-calendar',
  'ussd-portal',
  'schemes-of-work',
]

/**
 * Level-based feature gate aligned with zambiaSchoolFeatures feature ids.
 */
export function canUseFeatureByLevel(schoolLevel, featureId) {
  const school = { level: schoolLevel }
  const id = String(featureId || '').trim()

  if (
    id === 'continuous-assessment-tool' ||
    id === 'cbc-competency-tracker' ||
    id === 'phonics-trainer'
  ) {
    return canUseCBC(school)
  }

  const secondaryIds = new Set([
    'hod-dashboard',
    'hod-management',
    'basic-results',
    'junior-performance',
    'ecz-tracking',
    'ecz-practice',
    'ecz-exam-tracking',
    'ecz-sba',
    'mock-exams',
    'code-playground',
    'career-guidance',
  ])

  if (secondaryIds.has(id)) {
    return canUseECZSBA(school)
  }

  if (isSecondaryOnly(school)) {
    const primaryOnly = new Set([
      'phonics-trainer',
      'continuous-assessment-tool',
      'cbc-competency-tracker',
      'parent-report-cards-primary',
    ])
    if (primaryOnly.has(id)) return false
  }

  if (isPrimaryOnly(school)) {
    if (secondaryIds.has(id)) return false
  }

  return true
}

/**
 * Ownership-based feature gate aligned with zambiaSchoolFeatures.
 */
export function canUseFeatureByOwnership(ownershipType, featureId) {
  const school = { ownershipType }
  const id = String(featureId || '').trim()
  const resolved = id === 'school-fees-management' ? 'fee-management' : id

  const privateOnly = new Set([
    'fee-management',
    'parent-portal',
    'proprietor-dashboard',
    'sibling-discounts',
  ])
  if (privateOnly.has(resolved)) {
    return isPrivate(school)
  }

  const govtOnly = new Set([
    'emis-export',
    'grants-tracking',
    'gender-report',
    'gender-dropout-report',
    'teacher-leave',
    'teacher-deployment',
    'teacher-deployment-system',
  ])
  if (govtOnly.has(resolved)) {
    return isGovernment(school)
  }

  return true
}

/**
 * Returns a complete feature access object for a school.
 */
export function getSchoolFeatures(school) {
  return {
    cbc: canUseCBC(school),
    eczSBA: canUseECZSBA(school),
    eczExamTracking: canUseECZExamTracking(school),
    secondaryGrading: canUseSecondaryGrading(school),
    phonics: canUsePhonics(school),
    competencyAnalyser: canUseCompetencyAnalyser(school),
    mockExams: canUseMockExams(school),
    studyAssistant: canUseStudyAssistant(school),

    hod: canUseHOD(school),
    careerGuidance: canUseCareerGuidance(school),
    hostel: canUseHostel(school),
    codePlayground: canUseCodePlayground(school),

    feeManagement: canUseFeeManagement(school),
    parentPortal: canUseParentPortal(school),
    proprietorDashboard: canUseProprietorDashboard(school),
    siblingDiscounts: canUseSiblingDiscounts(school),

    emisExport: canUseEMISExport(school),
    grantsTracking: canUseGrantsTracking(school),
    genderReport: canUseGenderReport(school),
    teacherDeployment: canUseTeacherDeployment(school),
    teacherLeave: canUseTeacherLeave(school),

    isGovernment: isGovernment(school),
    isPrivate: isPrivate(school),
    hasPrimary: hasPrimaryClasses(school),
    hasSecondary: hasSecondaryClasses(school),
    isCombined: isCombined(school),
  }
}
