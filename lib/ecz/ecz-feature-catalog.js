/**
 * ECZ Assessment System — implemented features & teaching guidance for UI surfaces.
 */

import { ECZ_GUIDELINES_SUBJECT_COUNT } from '@/lib/ecz/ecz-subjects-data'

export const ECZ_RULES = [
  {
    id: 'form-weighting',
    rule: 1,
    title: 'Different assessment per form',
    summary: 'Forms 1–3: 30% SBA + 70% final exam. Form 4: final exam only (no SBA).',
    implemented: true,
    href: '/dashboard/teacher/assessments/ecz',
    cta: 'Open ECZ SBA Hub',
  },
  {
    id: 'zambian-context',
    rule: 2,
    title: 'Real-life Zambian context',
    summary:
      'SBA tasks must mention Zambian places, people, or situations. Abstract or foreign-only contexts are blocked.',
    implemented: true,
    href: '/dashboard/teacher/assessments/ecz',
    cta: 'Create SBA task',
  },
  {
    id: 'january-deadline',
    rule: 3,
    title: '31 January submission deadline',
    summary:
      'Countdown on the teacher dashboard. Urgent warnings under 14 days. Submissions blocked after the deadline.',
    implemented: true,
    href: '/dashboard/teacher/assessments/ecz',
    cta: 'View deadline tracker',
  },
  {
    id: 'four-level-rubric',
    rule: 4,
    title: 'Four-level grading (not A–C)',
    summary:
      'Excellent (4), Good (3), Fair (2), Needs Improvement (1). Auto-calculates marks per task (e.g. 15/20).',
    implemented: true,
    href: '/dashboard/teacher/assessments/ecz',
    cta: 'Record SBA scores',
  },
  {
    id: 'eighteen-subjects',
    rule: 5,
    title: `${ECZ_GUIDELINES_SUBJECT_COUNT} ECZ subjects & learning objectives`,
    summary:
      'Official construct statements and elements of construct for every ECZ secondary subject.',
    implemented: true,
    href: '/dashboard/teacher/assessments/ecz',
    cta: 'Browse guidelines',
  },
  {
    id: 'special-accommodations',
    rule: 6,
    title: 'Special accommodations',
    summary:
      'Register visual, hearing, physical, learning, and medical accommodations. HOD approves for ECZ audit.',
    implemented: true,
    href: '/dashboard/teacher/assessments/ecz?tab=accommodations',
    cta: 'Manage accommodations',
  },
  {
    id: 'evidence-storage',
    rule: 7,
    title: 'Evidence storage (2 years)',
    summary:
      'Upload marked work with auto 2-year expiry, retention status, and audit trail (who / when).',
    implemented: true,
    href: '/dashboard/teacher/assessments/ecz?tab=evidence',
    cta: 'SBA evidence vault',
  },
]

export const ECZ_IMPLEMENTED_FEATURES = [
  {
    id: 'ecz-hub',
    title: 'ECZ SBA Hub',
    description:
      'Create tasks, rubric builder, tracking sheet, record scores, sync subjects, export ECZ CSV.',
    href: '/dashboard/teacher/assessments/ecz',
    roles: ['teacher', 'hod', 'headteacher'],
  },
  {
    id: 'guidelines-catalog',
    title: 'Assessment Guidelines catalog',
    description: `${ECZ_GUIDELINES_SUBJECT_COUNT} subjects with constructs and elements.`,
    href: '/dashboard/teacher/assessments/ecz',
    roles: ['teacher', 'hod', 'headteacher'],
  },
  {
    id: 'sba-create',
    title: 'Create ECZ-compliant SBA',
    description: 'Form 4 blocked for SBA; Zambian context validated on save.',
    href: '/dashboard/teacher/assessments/ecz',
    roles: ['teacher', 'hod'],
  },
  {
    id: 'sba-scores',
    title: 'Record SBA scores (4-level rubric)',
    description: 'Excellent / Good / Fair / Needs Improvement with auto totals.',
    href: '/dashboard/teacher/assessments/ecz',
    roles: ['teacher', 'hod'],
  },
  {
    id: 'ecz-rubric-builder',
    title: 'ECZ rubric builder',
    description:
      'Subject-aware 4-level descriptors (Excellent / Good / Fair / Needs Improvement) for SBA tasks.',
    href: '/dashboard/teacher/assessments/ecz?tab=rubric',
    roles: ['teacher', 'hod'],
  },
  {
    id: 'ecz-tracking-sheet',
    title: 'SBA tracking sheet',
    description:
      'Tasks 1–3 (max 20 each), term test (max 40), term weights 20/30/50%, class summary.',
    href: '/dashboard/teacher/assessments/ecz?tab=tracking',
    roles: ['teacher', 'hod'],
  },
  {
    id: 'ecz-csv',
    title: 'Export to ECZ (CSV)',
    description: 'Centre-ready submission file by subject and form.',
    href: '/dashboard/teacher/assessments/ecz',
    roles: ['teacher', 'hod', 'headteacher'],
  },
  {
    id: 'deadline-tracker',
    title: '31 January deadline tracker',
    description: 'Green / orange / red status on hub and dashboards.',
    href: '/dashboard/teacher/assessments/ecz',
    roles: ['teacher', 'hod', 'headteacher'],
  },
  {
    id: 'question-bank',
    title: 'ECZ question bank',
    description: 'Build items aligned to constructs and command terms.',
    href: '/dashboard/teacher/assessments/question-bank',
    roles: ['teacher', 'hod'],
  },
  {
    id: 'ecz-practice',
    title: 'ECZ practice papers (AI)',
    description: 'Exam-style practice for students.',
    href: '/dashboard/student/ecz-practice',
    roles: ['student', 'teacher'],
  },
  {
    id: 'special-accommodations',
    title: 'Special accommodations register',
    description: 'Record and approve ECZ accommodations per learner.',
    href: '/dashboard/teacher/assessments/ecz?tab=accommodations',
    roles: ['teacher', 'hod', 'headteacher'],
  },
  {
    id: 'evidence-vault',
    title: 'SBA evidence vault (2-year)',
    description: 'Upload scripts, photos, videos with expiry tracking.',
    href: '/dashboard/teacher/assessments/ecz?tab=evidence',
    roles: ['teacher', 'hod', 'headteacher'],
  },
  {
    id: 'exam-tracking',
    title: 'ECZ exam tracking',
    description: 'Headteacher CA, mocks, and pass-rate overview.',
    href: '/dashboard/headteacher/exam-tracking',
    roles: ['headteacher'],
  },
  {
    id: 'lesson-planner',
    title: 'AI lesson planner (ECZ-aligned)',
    description: 'Plans tied to Zambian curriculum and real contexts.',
    href: '/dashboard/teacher/lesson-planner',
    roles: ['teacher', 'hod', 'headteacher'],
  },
  {
    id: 'story-weaver',
    title: 'Story Weaver',
    description: 'Reading materials with local settings for language lessons.',
    href: '/dashboard/teacher/story-weaver',
    roles: ['teacher', 'hod'],
  },
  {
    id: 'quiz-maker',
    title: 'Quiz Maker',
    description: 'Form 1–5 assessments with instant keys.',
    href: '/dashboard/teacher/quiz-maker',
    roles: ['teacher', 'hod'],
  },
]

/** How ECZ expects lessons to be taught — shown across Advanced Teaching Tools tabs. */
export const ECZ_TEACHING_PRACTICES = [
  {
    id: 'construct-led',
    title: 'Teach to the construct',
    body: 'Every lesson should build toward the subject construct (e.g. “demonstrates numerical proficiency…”). Open the guidelines catalog to pick element statements for your topic.',
  },
  {
    id: 'zambian-context-lesson',
    title: 'Use Zambian contexts in class',
    body: 'Use local examples: markets in Lusaka, farming in Mkushi, minibus fares in Kitwe, community projects, ZESCO, chiefs, ceremonies — not abstract foreign-only scenarios.',
  },
  {
    id: 'sba-alignment',
    title: 'Align classwork with SBA tasks',
    body: 'Forms 1–3: classroom activities should prepare learners for three SBA tasks (20 marks each) plus a term test (40 marks). Form 4: focus on exam skills only.',
  },
  {
    id: 'inquiry-practical',
    title: 'Inquiry, practical & portfolio tasks',
    body: 'ECZ expects projects, practicals, investigations, field studies, and portfolios — not only written tests. Vary task types in the SBA hub.',
  },
  {
    id: 'command-terms',
    title: 'Use ECZ command terms',
    body: 'Calculate, explain, evaluate, justify, describe — match verbs in questions and lesson outcomes to ECZ examination language.',
  },
  {
    id: 'differentiate-forms',
    title: 'Differentiate by form',
    body: 'Form 1 builds foundations; Form 3 integrates across elements; Form 4 is examination-focused with no SBA component.',
  },
]

/** Tab-specific ECZ links and teaching focus for Advanced Teaching Tools. */
export const ADVANCED_TAB_ECZ = {
  'ecz-system': {
    title: 'ECZ Assessment System',
    subtitle: 'Full compliance with Examination Council of Zambia rules',
    ruleIds: ECZ_RULES.map((r) => r.id),
    featureIds: ECZ_IMPLEMENTED_FEATURES.map((f) => f.id),
    practiceIds: ECZ_TEACHING_PRACTICES.map((p) => p.id),
  },
  'creative-teaching': {
    title: 'Creative teaching & ECZ',
    subtitle: 'STEM and creative tools that support ECZ-style learning',
    ruleIds: ['zambian-context', 'eighteen-subjects'],
    featureIds: ['lesson-planner', 'story-weaver', 'ecz-practice', 'ecz-hub'],
    practiceIds: ['zambian-context-lesson', 'inquiry-practical'],
  },
  'curriculum-mapping': {
    title: 'Curriculum mapping & ECZ constructs',
    subtitle: 'Map lessons to official ECZ elements of construct',
    ruleIds: ['eighteen-subjects'],
    featureIds: ['guidelines-catalog', 'lesson-planner', 'ecz-hub'],
    practiceIds: ['construct-led', 'command-terms'],
  },
  'differentiated-instruction': {
    title: 'Differentiated instruction & accommodations',
    subtitle: 'Support all learners including ECZ special accommodations',
    ruleIds: ['form-weighting', 'special-accommodations'],
    featureIds: ['ecz-hub', 'sba-scores', 'special-accommodations'],
    practiceIds: ['differentiate-forms', 'sba-alignment'],
  },
  'student-portfolios': {
    title: 'Portfolios & SBA evidence',
    subtitle: 'Portfolio tasks count toward ECZ SBA — keep evidence for 2 years',
    ruleIds: ['evidence-storage', 'four-level-rubric'],
    featureIds: ['ecz-hub', 'sba-create', 'evidence-vault'],
    practiceIds: ['inquiry-practical', 'sba-alignment'],
  },
  'lesson-planning': {
    title: 'Collaborative lesson planning (ECZ-aligned)',
    subtitle: 'Plan lessons with constructs, contexts, and command terms',
    ruleIds: ['zambian-context', 'eighteen-subjects'],
    featureIds: ['lesson-planner', 'guidelines-catalog', 'story-weaver'],
    practiceIds: ['construct-led', 'zambian-context-lesson', 'command-terms'],
  },
  'parent-conferences': {
    title: 'Parent communication & SBA results',
    subtitle: 'Explain 30/70 weighting and January deadlines to guardians',
    ruleIds: ['form-weighting', 'january-deadline', 'four-level-rubric'],
    featureIds: ['ecz-hub', 'sba-scores'],
    practiceIds: ['sba-alignment', 'differentiate-forms'],
  },
  'assessment-builder': {
    title: 'ECZ assessment builder',
    subtitle: 'All assessment tools that enforce ECZ rules',
    ruleIds: ['form-weighting', 'zambian-context', 'january-deadline', 'four-level-rubric'],
    featureIds: ['ecz-hub', 'sba-create', 'sba-scores', 'ecz-csv', 'question-bank', 'quiz-maker'],
    practiceIds: ['sba-alignment', 'inquiry-practical', 'command-terms'],
  },
  'learning-objectives': {
    title: 'Learning objectives (ECZ constructs)',
    subtitle: 'Official construct statements and elements per subject',
    ruleIds: ['eighteen-subjects'],
    featureIds: ['guidelines-catalog', 'ecz-hub'],
    practiceIds: ['construct-led', 'command-terms'],
  },
  'behavior-management': {
    title: 'Behaviour & inclusive learning',
    subtitle: 'Link behaviour support to accommodations where needed',
    ruleIds: ['special-accommodations'],
    featureIds: ['ecz-hub', 'special-accommodations'],
    practiceIds: ['differentiate-forms'],
  },
  'professional-community': {
    title: 'Professional learning & ECZ',
    subtitle: 'Share ECZ-compliant resources with colleagues',
    ruleIds: ['eighteen-subjects', 'zambian-context'],
    featureIds: ['lesson-planner', 'guidelines-catalog'],
    practiceIds: ['construct-led', 'zambian-context-lesson'],
  },
  mentorship: {
    title: 'Mentorship & ECZ compliance',
    subtitle: 'Coach new teachers on SBA, rubrics, and deadlines',
    ruleIds: ['form-weighting', 'january-deadline', 'four-level-rubric'],
    featureIds: ['ecz-hub', 'deadline-tracker'],
    practiceIds: ['sba-alignment', 'differentiate-forms'],
  },
}
