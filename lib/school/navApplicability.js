/**
 * Sidebar / route applicability for primary vs secondary school levels.
 * Prefer capability flags on nav items over filtering by display name.
 */

import {
  canUseCBC,
  canUseCareerGuidance,
  canUseCodePlayground,
  canUseECZSBA,
  canUseHOD,
  canUseMockExams,
  canUseSecondaryGrading,
  getSchoolFeatures,
  hasPrimaryClasses,
  hasSecondaryClasses,
  isPrimaryOnly,
} from '@/lib/school/schoolTypeHelpers'
import { planIncludes } from '@/lib/zambiaSchoolFeatures'

/**
 * @param {{
 *   secondaryOnly?: boolean
 *   primaryOnly?: boolean
 *   requiresSecondary?: boolean
 *   requiresPrimary?: boolean
 *   requiresFeature?: string
 *   requiresPlanFeature?: string
 *   href?: string
 * } | null | undefined} item
 * @param {{ level?: string | null, ownershipType?: string | null, plan?: string | null, trialEndsAt?: Date | string | null } | null | undefined} school
 * @param {{ schoolReady?: boolean }} [options]
 */
export function isNavItemApplicable(item, school, options = {}) {
  if (!item) return false

  // Until school level is known, hide level-gated destinations so secondary
  // links never flash for primary teachers.
  if (options.schoolReady === false) {
    if (
      item.secondaryOnly ||
      item.primaryOnly ||
      item.requiresSecondary ||
      item.requiresPrimary ||
      item.requiresFeature ||
      item.requiresPlanFeature ||
      isSecondaryOnlyPath(item.href) ||
      isPrimaryOnlyPath(item.href)
    ) {
      return false
    }
    return true
  }

  if (item.requiresPlanFeature) {
    const plan = String(school?.plan || 'basic').toLowerCase()
    if (!planIncludes(plan, item.requiresPlanFeature, school)) {
      return false
    }
  }

  const features = getSchoolFeatures(school || {})
  const primaryOnlySchool = isPrimaryOnly(school)
  const href = String(item.href || '').split('?')[0]

  if ((item.secondaryOnly || item.requiresSecondary) && !hasSecondaryClasses(school)) {
    return false
  }
  if ((item.primaryOnly || item.requiresPrimary) && !hasPrimaryClasses(school)) {
    return false
  }

  // Hard path rules — even if a nav item forgot flags.
  if (isSecondaryOnlyPath(href) && !hasSecondaryClasses(school)) {
    return false
  }
  if (isPrimaryOnlyPath(href) && !hasPrimaryClasses(school)) {
    return false
  }

  switch (item.requiresFeature) {
    case 'secondaryGrading':
      return Boolean(features.secondaryGrading && canUseSecondaryGrading(school))
    case 'eczSBA':
      return Boolean(features.eczSBA && canUseECZSBA(school))
    case 'cbc':
      return Boolean(features.cbc && canUseCBC(school))
    case 'mockExams':
      return Boolean(features.mockExams && canUseMockExams(school))
    case 'codePlayground':
      return Boolean(features.codePlayground && canUseCodePlayground(school))
    case 'careerGuidance':
      return Boolean(features.careerGuidance && canUseCareerGuidance(school))
    case 'hod':
      return Boolean(features.hod && canUseHOD(school))
    case 'feeManagement':
      return Boolean(features.feeManagement)
    case 'hostel':
      return Boolean(features.hostel)
    case 'proprietorDashboard':
      return Boolean(features.proprietorDashboard)
    default:
      break
  }

  // Primary-only schools never see secondary Results grading.
  if (primaryOnlySchool && item.requiresFeature === 'secondaryGrading') {
    return false
  }

  return true
}

/** Path prefixes that require secondary (or combined) schools. */
export const SECONDARY_ONLY_ROUTE_PREFIXES = [
  '/dashboard/hod',
  '/dashboard/teacher/old-syllabus',
  '/dashboard/teacher/assessments/ecz',
  '/dashboard/teacher/exam-analysis',
  '/dashboard/teacher/results',
  '/dashboard/results',
  '/dashboard/student/results',
  '/dashboard/student/ecz-practice',
  '/dashboard/student/mock-exam',
  '/dashboard/student/code-playground',
  '/dashboard/student/learning-path',
  '/dashboard/parent/results',
  '/dashboard/headteacher/exam-tracking',
  '/dashboard/headteacher/hostel',
  '/dashboard/guidance/careers',
  '/dashboard/guidance/career-clusters',
  '/dashboard/guidance/resources',
]

/** Path prefixes that require primary (or combined) schools. */
export const PRIMARY_ONLY_ROUTE_PREFIXES = [
  '/dashboard/teacher/assessments/cbc',
  '/dashboard/senior-teacher',
  '/dashboard/headteacher/senior-teachers',
]

function pathMatchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function isSecondaryOnlyPath(pathname) {
  const path = String(pathname || '').split('?')[0]
  return SECONDARY_ONLY_ROUTE_PREFIXES.some((prefix) => pathMatchesPrefix(path, prefix))
}

export function isPrimaryOnlyPath(pathname) {
  const path = String(pathname || '').split('?')[0]
  return PRIMARY_ONLY_ROUTE_PREFIXES.some((prefix) => pathMatchesPrefix(path, prefix))
}

/**
 * @returns {'secondary' | 'primary' | null}
 */
export function getSchoolLevelPathGate(pathname) {
  if (isSecondaryOnlyPath(pathname)) return 'secondary'
  if (isPrimaryOnlyPath(pathname)) return 'primary'
  return null
}
