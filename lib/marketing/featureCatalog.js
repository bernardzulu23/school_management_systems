/**
 * Single source for landing + dashboard feature metadata (plans, routes, feature gates).
 */

export const AI_FEATURE_CATALOG = [
  {
    id: 'ai-lesson-planner',
    title: 'Lesson Planner',
    description: 'Generate ECZ-aligned lesson plans in 30 seconds.',
    detail: 'Save 1.5 hours per plan.',
    plans: ['standard', 'premium', 'trial'],
    planLabel: 'Standard, Premium',
    href: '/dashboard/teacher/lesson-planner',
    loginHint: 'lesson-planner',
  },
  {
    id: 'ai-story-weaver',
    title: 'Story Weaver',
    description: 'Create engaging reading materials on demand.',
    detail: 'Perfect for Grade 1–7 reading lessons.',
    plans: ['standard', 'premium', 'trial'],
    planLabel: 'Standard, Premium',
    href: '/dashboard/teacher/story-weaver',
    loginHint: 'story-weaver',
  },
  {
    id: 'ai-quiz-maker',
    title: 'Quiz Maker',
    description: 'Generate instant assessments with answer keys.',
    detail: 'Multiple choice, true/false, short answer.',
    plans: ['standard', 'premium', 'trial'],
    planLabel: 'Standard, Premium',
    href: '/dashboard/teacher/quiz-maker',
    loginHint: 'quiz-maker',
  },
  {
    id: 'ai-report-comments',
    title: 'Report Comments',
    description: 'Write personalized student feedback at scale.',
    detail: 'Save 8+ hours per report cycle.',
    plans: ['premium', 'trial'],
    planLabel: 'Premium only',
    href: '/dashboard/teacher/report-comments',
    loginHint: 'report-comments',
  },
  {
    id: 'ecz-practice',
    title: 'ECZ Practice Papers',
    description: 'Generate exam-style practice questions.',
    detail: 'All subjects, all grades.',
    plans: ['standard', 'premium', 'trial'],
    planLabel: 'Standard, Premium',
    href: '/dashboard/student/ecz-practice',
    loginHint: 'ecz-practice',
  },
]

export const CURRICULUM_FEATURE_CATALOG = [
  {
    id: 'ecz-tracking',
    title: 'ECZ Exam Tracking',
    body: 'Record internal assessments, CAs, and mock results. Predict ECZ pass rates before national exams.',
    href: '/dashboard/headteacher/exam-tracking',
    minPlan: 'standard',
    pills: ['CA & mocks', 'Pass rate', 'By form'],
  },
  {
    id: 'moe-reports',
    title: 'MOE-aligned reporting',
    body: 'Generate district-ready enrollment, staffing, and class summaries for inspections and EMIS.',
    href: '/dashboard/headteacher/moe-reports',
    minPlan: 'standard',
    pills: ['Enrollment', 'Staffing', 'Export CSV'],
  },
  {
    id: 'stem-monitoring',
    title: 'STEM subject performance monitoring',
    body: 'Track Mathematics, Science, and ICT gaps with intervention flags per class.',
    href: '/dashboard/headteacher/stem-monitoring',
    minPlan: 'standard',
    pills: ['Math', 'Science', 'ICT'],
  },
  {
    id: 'classes',
    title: 'Class management',
    body: 'Zambian secondary structure: Forms 1–4, term cycles, and class lists aligned to your school.',
    href: '/dashboard/classes',
    minPlan: 'basic',
    pills: ['Forms 1–4', 'Class lists', 'Teachers'],
  },
]

/** Post-login destination when user arrives from landing feature links (?from=) */
export const FEATURE_LOGIN_REDIRECTS = {
  'lesson-planner': '/dashboard/teacher/lesson-planner',
  'story-weaver': '/dashboard/teacher/story-weaver',
  'quiz-maker': '/dashboard/teacher/quiz-maker',
  'report-comments': '/dashboard/teacher/report-comments',
  'ecz-practice': '/dashboard/student/ecz-practice',
  'ecz-tracking': '/dashboard/headteacher/exam-tracking',
  'moe-reports': '/dashboard/headteacher/moe-reports',
  'stem-monitoring': '/dashboard/headteacher/stem-monitoring',
  classes: '/dashboard/classes',
}

export const HEADTEACHER_PREVIEW_PILLS = [
  { label: 'Attendance', href: '/dashboard/attendance/returns', statKey: 'attendanceRate' },
  { label: 'Performance', href: '/dashboard/headteacher/exam-tracking', statKey: 'averageGrade' },
  { label: 'HODs', href: '/dashboard/users', statKey: 'totalHods' },
]
