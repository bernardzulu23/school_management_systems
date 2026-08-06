/**
 * ZSMS School Type Helpers
 * Single source of truth for feature gating by school level and ownership.
 * Uses School.level (primary|secondary|combined) and School.ownershipType (not schoolType).
 */

import { PRIMARY_ONLY_FEATURE_IDS, SECONDARY_ONLY_FEATURE_IDS } from '@/lib/school/levelFeatureIds'

function normalizeLevel(level) {
  const raw = String(level || '')
    .trim()
    .toLowerCase()
  if (raw === 'primary' || raw === 'secondary' || raw === 'combined') return raw
  // Legacy callers that omit level historically meant combined — keep for
  // isCombined/isPrimaryOnly only when explicitly passed through known checks.
  return raw || 'combined'
}

/** True when School.level is present (do not treat missing as combined for UI). */
export function hasKnownSchoolLevel(school) {
  const raw = String(school?.level || '')
    .trim()
    .toLowerCase()
  return raw === 'primary' || raw === 'secondary' || raw === 'combined'
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
  if (!hasKnownSchoolLevel(school)) return false
  return normalizeLevel(school?.level) === 'primary'
}

/** Only Form 1–Grade 12 (no primary classes) */
export function isSecondaryOnly(school) {
  if (!hasKnownSchoolLevel(school)) return false
  return normalizeLevel(school?.level) === 'secondary'
}

/** Has both primary (ECE–G7) AND secondary (F1–G12) classes */
export function isCombined(school) {
  if (!hasKnownSchoolLevel(school)) return false
  return normalizeLevel(school?.level) === 'combined'
}

/** Has ANY secondary classes (secondary or combined). Unknown level → false. */
export function hasSecondaryClasses(school) {
  if (!hasKnownSchoolLevel(school)) return false
  return isSecondaryOnly(school) || isCombined(school)
}

/** Has ANY primary classes (primary or combined). Unknown level → false. */
export function hasPrimaryClasses(school) {
  if (!hasKnownSchoolLevel(school)) return false
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

const PRIMARY_ONLY_IDS = new Set(PRIMARY_ONLY_FEATURE_IDS)
const SECONDARY_ONLY_IDS = new Set(SECONDARY_ONLY_FEATURE_IDS)

/**
 * Level-based feature gate aligned with zambiaSchoolFeatures feature ids.
 * Pure primary never gets secondary-only ids; pure secondary never gets primary-only ids.
 * Combined gets both. Unknown/empty level denies level-gated ids.
 */
export function canUseFeatureByLevel(schoolLevel, featureId) {
  const raw = String(schoolLevel || '').trim()
  const id = String(featureId || '').trim()
  if (!id) return false

  if (!raw) {
    if (PRIMARY_ONLY_IDS.has(id) || SECONDARY_ONLY_IDS.has(id)) return false
    return true
  }

  const school = { level: raw }

  if (PRIMARY_ONLY_IDS.has(id)) {
    return hasPrimaryClasses(school)
  }
  if (SECONDARY_ONLY_IDS.has(id)) {
    return hasSecondaryClasses(school)
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
 * When level is unknown, all level-gated flags are false (never assume combined).
 */
export function getSchoolFeatures(school) {
  const levelKnown = hasKnownSchoolLevel(school)
  const safe = levelKnown ? school : { ...school, level: '' }

  if (!levelKnown) {
    return {
      cbc: false,
      eczSBA: false,
      eczExamTracking: false,
      secondaryGrading: false,
      phonics: false,
      competencyAnalyser: false,
      mockExams: false,
      studyAssistant: canUseStudyAssistant(),

      hod: false,
      careerGuidance: false,
      hostel: false,
      codePlayground: false,

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
      hasPrimary: false,
      hasSecondary: false,
      isCombined: false,
      levelKnown: false,
      facialAttendance: school?.facialAttendanceEnabled === true,
    }
  }

  return {
    cbc: canUseCBC(safe),
    eczSBA: canUseECZSBA(safe),
    eczExamTracking: canUseECZExamTracking(safe),
    secondaryGrading: canUseSecondaryGrading(safe),
    phonics: canUsePhonics(safe),
    competencyAnalyser: canUseCompetencyAnalyser(safe),
    mockExams: canUseMockExams(safe),
    studyAssistant: canUseStudyAssistant(),

    hod: canUseHOD(safe),
    careerGuidance: canUseCareerGuidance(safe),
    hostel: canUseHostel(safe),
    codePlayground: canUseCodePlayground(safe),

    feeManagement: canUseFeeManagement(safe),
    parentPortal: canUseParentPortal(safe),
    proprietorDashboard: canUseProprietorDashboard(safe),
    siblingDiscounts: canUseSiblingDiscounts(safe),

    emisExport: canUseEMISExport(safe),
    grantsTracking: canUseGrantsTracking(safe),
    genderReport: canUseGenderReport(safe),
    teacherDeployment: canUseTeacherDeployment(safe),
    teacherLeave: canUseTeacherLeave(safe),

    isGovernment: isGovernment(safe),
    isPrivate: isPrivate(safe),
    hasPrimary: hasPrimaryClasses(safe),
    hasSecondary: hasSecondaryClasses(safe),
    isCombined: isCombined(safe),
    levelKnown: true,
    /** Explicit school opt-in — not inferred from ownership/plan. */
    facialAttendance: school?.facialAttendanceEnabled === true,
  }
}
