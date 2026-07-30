/**
 * Sidebar / route applicability for primary vs secondary school levels.
 * Prefer capability flags on nav items over filtering by display name.
 */

import {
  canUseCBC,
  canUseCareerGuidance,
  canUseCodePlayground,
  canUseECZSBA,
  canUseMockExams,
  canUseSecondaryGrading,
  getSchoolFeatures,
  hasPrimaryClasses,
  hasSecondaryClasses,
  isPrimaryOnly,
} from '@/lib/school/schoolTypeHelpers'

/**
 * @param {{
 *   secondaryOnly?: boolean
 *   primaryOnly?: boolean
 *   requiresSecondary?: boolean
 *   requiresPrimary?: boolean
 *   requiresFeature?: string
 * } | null | undefined} item
 * @param {{ level?: string | null, ownershipType?: string | null } | null | undefined} school
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
      item.requiresFeature
    ) {
      return false
    }
    return true
  }

  const features = getSchoolFeatures(school || {})
  const primaryOnlySchool = isPrimaryOnly(school)

  if ((item.secondaryOnly || item.requiresSecondary) && !hasSecondaryClasses(school)) {
    return false
  }
  if ((item.primaryOnly || item.requiresPrimary) && !hasPrimaryClasses(school)) {
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
  '/dashboard/teacher/old-syllabus',
  '/dashboard/teacher/assessments/ecz',
  '/dashboard/student/ecz-practice',
  '/dashboard/student/mock-exam',
  '/dashboard/student/code-playground',
]

export function isSecondaryOnlyPath(pathname) {
  const path = String(pathname || '').split('?')[0]
  return SECONDARY_ONLY_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}
