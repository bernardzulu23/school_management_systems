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
  isSecondaryOnly,
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

  const href = String(item.href || '').split('?')[0]
  const isPrimaryGated =
    item.primaryOnly ||
    item.requiresPrimary ||
    isPrimaryOnlyPath(href) ||
    item.requiresFeature === 'cbc'

  // Until school level is known, hide level-gated destinations so secondary
  // links never flash for primary teachers — and primary never flash for secondary.
  if (options.schoolReady === false) {
    if (
      item.secondaryOnly ||
      isPrimaryGated ||
      item.requiresSecondary ||
      item.requiresFeature ||
      item.requiresPlanFeature ||
      isSecondaryOnlyPath(item.href)
    ) {
      return false
    }
    return true
  }

  // Hard fail-closed: secondary-only schools never see primary-only destinations.
  if (
    school &&
    (isSecondaryOnly(school) || (!hasPrimaryClasses(school) && hasSecondaryClasses(school))) &&
    isPrimaryGated
  ) {
    return false
  }

  if (item.requiresPlanFeature) {
    const plan = String(school?.plan || 'basic').toLowerCase()
    if (!planIncludes(plan, item.requiresPlanFeature, school)) {
      return false
    }
  }

  const features = getSchoolFeatures(school || {})
  const primaryOnlySchool = isPrimaryOnly(school)

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
  '/dashboard/headteacher/exam-analysis',
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
  '/dashboard/headteacher/houses/activities',
  '/dashboard/headteacher/primary-results-analysis',
  '/dashboard/teacher/primary-results-analysis',
  '/dashboard/teacher/primary-results',
  '/dashboard/teacher/extracurricular',
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
