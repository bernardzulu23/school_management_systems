/**
 * Canonical feature ids gated by school level.
 * Kept separate from zambiaSchoolFeatures catalogs to avoid circular imports
 * with schoolTypeHelpers.
 */

/** Pure-primary (and combined) tools — denied for secondary-only schools. */
export const PRIMARY_ONLY_FEATURE_IDS = [
  'phonics-trainer',
  'number-bonds',
  'early-writing-support',
  'life-skills-curriculum',
  'values-education',
  'english-phonic-stages',
  'singapore-math-tracker',
  'environmental-science-projects',
  'movement-coordination-tracker',
  'creative-arts-portfolio',
  'cbc-competency-tracker',
  'continuous-assessment-tool',
  'parent-report-cards-primary',
  'childhood-welfare-monitoring',
  'nutrition-feeding-program',
  'wash-facilities-tracker',
  'local-language-subjects',
  'senior-teacher',
  'senior-teacher-dashboard',
]

/** Pure-secondary (and combined) tools — denied for primary-only schools. */
export const SECONDARY_ONLY_FEATURE_IDS = [
  'hod-dashboard',
  'hod-management',
  'basic-results',
  'junior-performance',
  'ecz-tracking',
  'ecz-practice',
  'ecz-exam-tracking',
  'ecz-sba',
  'sba-hub',
  'mock-exams',
  'code-playground',
  'career-guidance',
  'hostel',
]

/**
 * Available at all levels — must not live in SECONDARY_ONLY / PRIMARY_ONLY deny lists.
 */
export const MULTI_LEVEL_FEATURE_IDS = [
  'ai-tools',
  'ai-study-assistant',
  'ai-term-reports',
  'ai-lesson-planner',
  'ai-quiz-maker',
  'ai-story-weaver',
]
