import { InnovationLabSystem } from '@/lib/innovationLabSystem'

export const LAB_TYPES = InnovationLabSystem.LAB_TYPES
export const PROJECT_CATEGORIES = InnovationLabSystem.PROJECT_CATEGORIES
export const INNOVATION_METHODOLOGIES = InnovationLabSystem.INNOVATION_METHODOLOGIES

export const PROJECT_STATUS_LABELS = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Under review',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  })
)

/** Role-aware tool links — hrefs must exist in the app. */
export function getInnovationTools(role) {
  const r = String(role || 'student').toLowerCase()
  const isStaff = ['teacher', 'hod', 'headteacher', 'admin'].includes(r)

  const aiLearning = isStaff
    ? [
        {
          name: 'AI Lesson Planner',
          href: '/dashboard/teacher/lesson-planner',
          description: 'Generate ECZ-aligned lesson plans',
        },
        {
          name: 'AI Quiz Maker',
          href: '/dashboard/teacher/quiz-maker',
          description: 'Build interactive assessments with AI',
        },
        {
          name: 'AI Story Weaver',
          href: '/dashboard/teacher/story-weaver',
          description: 'Turn topics into engaging stories',
        },
        {
          name: 'Upload for AI (RAG)',
          href: '/dashboard/teacher/ai-materials',
          description: 'Ground AI answers in your materials',
        },
        {
          name: 'AI Report Comments',
          href: '/dashboard/teacher/report-comments',
          description: 'Draft report card comments',
        },
        {
          name: 'ECZ SBA Hub',
          href: '/dashboard/teacher/assessments/ecz',
          description: 'School-based assessment workflow',
        },
      ]
    : [
        {
          name: 'Study Assistant',
          href: '/dashboard/student/study-assistant',
          description: 'Ask questions about your subjects',
        },
        {
          name: 'Flashcards',
          href: '/dashboard/student/flashcards',
          description: 'Spaced-repetition revision decks',
        },
        {
          name: 'Mock Examination',
          href: '/dashboard/student/mock-exam',
          description: 'Practice under exam conditions',
        },
      ]

  const immersive = isStaff
    ? [
        {
          name: 'Game Management',
          href: '/dashboard/teacher/games',
          description: 'Create learning games for classes',
        },
        {
          name: 'Question Bank',
          href: '/dashboard/teacher/assessments/question-bank',
          description: 'Reusable assessment items',
        },
      ]
    : [
        {
          name: 'Games & Learning',
          href: '/dashboard/student',
          description: 'Open the Games tab on your student dashboard',
        },
        {
          name: 'Digital Music',
          href: '/dashboard/student/music',
          description: 'Compose and explore music',
        },
        {
          name: 'Mock Examination',
          href: '/dashboard/student/mock-exam',
          description: 'Timed practice papers',
        },
      ]

  const wellness = [
    {
      name: 'SDG Health & Wellness',
      href: '/dashboard/sdg',
      description: 'SDG 3 health programmes and metrics',
    },
    {
      name: 'Send feedback / get support',
      href: '/dashboard/feedback',
      description: 'Reach school leadership confidentially',
    },
    ...(isStaff
      ? [
          {
            name: 'Special accommodations',
            href: '/dashboard/teacher/assessments/ecz?tab=accommodations',
            description: 'ECZ learner accommodation register',
          },
        ]
      : []),
  ]

  const credentials = isStaff
    ? [
        {
          name: 'Results & analytics',
          href: '/dashboard/results',
          description: 'Official grade records',
        },
        {
          name: 'ECZ exam tracking',
          href: '/dashboard/headteacher/exam-tracking',
          description: 'Centre-level exam monitoring',
        },
        {
          name: 'MOE reports',
          href: '/dashboard/headteacher/moe-reports',
          description: 'Ministry reporting exports',
        },
      ]
    : [
        {
          name: 'My results',
          href: '/dashboard/results',
          description: 'View your published results',
        },
        {
          name: 'My assessments',
          href: '/dashboard/assessments',
          description: 'Assignments and quiz attempts',
        },
      ]

  return [
    {
      id: 'ai-learning',
      title: 'AI-Powered Learning',
      description: 'Lesson planning, quizzes, stories, and study tools already live in ZSMS.',
      icon: 'Brain',
      status: 'active',
      tools: aiLearning,
    },
    {
      id: 'immersive',
      title: 'Interactive Learning',
      description: 'Games, music, mock exams, and hands-on practice environments.',
      icon: 'Glasses',
      status: 'active',
      tools: immersive,
    },
    {
      id: 'wellness',
      title: 'Wellness & Student Support',
      description: 'Health programmes, accommodations, and confidential feedback channels.',
      icon: 'Heart',
      status: 'active',
      tools: wellness,
    },
    {
      id: 'credentials',
      title: 'Verified Academic Records',
      description: 'Results, ECZ workflows, and official school reporting — not blockchain hype.',
      icon: 'Shield',
      status: 'active',
      tools: credentials.filter((t) => {
        if (r === 'headteacher' || r === 'admin') return true
        if (t.href.includes('headteacher')) return false
        return true
      }),
    },
  ]
}
