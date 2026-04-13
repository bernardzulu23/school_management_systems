/**
 * Run this once to seed creative features into the database:
 * node seed-creative-features.js
 * OR add to your existing seed.js file
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CREATIVE_FEATURES = [
  // ── Creative Teaching Tools ──────────────────────────────
  {
    featureId: 'interactive-whiteboard',
    name: 'Interactive Whiteboard',
    description:
      'Digital canvas for real-time drawing, annotation and collaboration between teacher and students.',
    category: 'creative',
    icon: 'Palette',
    difficulty: 'Beginner',
    estimatedTime: 'Instant',
    route: '/dashboard/teacher/whiteboard',
    isActive: true,
    isFeatured: true,
    accessRoles: ['teacher', 'hod', 'headteacher', 'administrator'],
    tags: ['drawing', 'collaboration', 'visual'],
    order: 1,
  },
  {
    featureId: 'ai-story-weaver',
    name: 'AI Story Weaver',
    description:
      'Generate engaging Zambian-context educational stories, fables, and poems using AI for any subject and grade.',
    category: 'creative',
    icon: 'BookOpen',
    difficulty: 'Intermediate',
    estimatedTime: '15-30 mins',
    route: '/dashboard/teacher/story-weaver',
    isActive: true,
    isFeatured: true,
    accessRoles: ['teacher', 'hod', 'headteacher', 'administrator'],
    tags: ['AI', 'stories', 'English', 'writing'],
    order: 2,
  },
  {
    featureId: 'digital-music-composer',
    name: 'Digital Music Composer',
    description:
      'Create and play music sequences using an interactive note sequencer with piano roll visualisation.',
    category: 'creative',
    icon: 'Music',
    difficulty: 'Beginner',
    estimatedTime: '20 mins',
    route: '/dashboard/student/music',
    isActive: true,
    isFeatured: false,
    accessRoles: ['student', 'teacher'],
    tags: ['music', 'creative arts', 'composition'],
    order: 3,
  },
  {
    featureId: 'ai-lesson-planner',
    name: 'AI Lesson Planner',
    description:
      'Generate complete lesson plans for any subject and grade using AI, aligned to the Zambian curriculum.',
    category: 'creative',
    icon: 'ClipboardList',
    difficulty: 'Beginner',
    estimatedTime: '5 mins',
    route: '/dashboard/teacher/lesson-planner',
    isActive: true,
    isFeatured: true,
    accessRoles: ['teacher', 'hod', 'headteacher', 'administrator'],
    tags: ['AI', 'planning', 'curriculum'],
    order: 4,
  },
  {
    featureId: 'ai-quiz-maker',
    name: 'AI Quiz Maker',
    description:
      'Instantly generate MCQ, true/false, and short answer questions for any topic and difficulty level.',
    category: 'creative',
    icon: 'HelpCircle',
    difficulty: 'Beginner',
    estimatedTime: '10 mins',
    route: '/dashboard/teacher/quiz-maker',
    isActive: true,
    isFeatured: true,
    accessRoles: ['teacher', 'hod', 'headteacher', 'administrator'],
    tags: ['AI', 'assessment', 'quiz', 'ECZ'],
    order: 5,
  },
  {
    featureId: 'ai-report-comments',
    name: 'AI Report Card Comments',
    description:
      'Auto-generate professional student report card comments based on performance data.',
    category: 'creative',
    icon: 'FileText',
    difficulty: 'Beginner',
    estimatedTime: '5 mins',
    route: '/dashboard/teacher/report-comments',
    isActive: true,
    isFeatured: false,
    accessRoles: ['teacher', 'hod', 'headteacher', 'administrator'],
    tags: ['AI', 'reports', 'comments'],
    order: 6,
  },

  // ── STEM Learning Features ────────────────────────────────
  {
    featureId: 'virtual-science-lab',
    name: 'Virtual Science Lab',
    description:
      'Interactive PhET simulations for Physics, Chemistry, and Biology — no equipment or chemicals needed.',
    category: 'stem',
    icon: 'FlaskConical',
    difficulty: 'Advanced',
    estimatedTime: '45 mins',
    route: '/dashboard/student/virtual-lab',
    isActive: true,
    isFeatured: true,
    accessRoles: ['student', 'teacher', 'hod'],
    tags: ['science', 'physics', 'chemistry', 'biology', 'simulation'],
    order: 7,
  },
  {
    featureId: 'code-playground',
    name: 'Code Playground',
    description:
      'Write and run Python, JavaScript, Java, C, and Bash code in the browser with instant output.',
    category: 'stem',
    icon: 'Code2',
    difficulty: 'Intermediate',
    estimatedTime: 'Flexible',
    route: '/dashboard/student/code-playground',
    isActive: true,
    isFeatured: true,
    accessRoles: ['student', 'teacher'],
    tags: ['coding', 'programming', 'ICT', 'Python', 'JavaScript'],
    order: 8,
  },
  {
    featureId: '3d-shape-builder',
    name: '3D Shape Builder',
    description:
      'Build and rotate 3D geometric shapes to understand volume, surface area, and spatial relationships.',
    category: 'stem',
    icon: 'Box',
    difficulty: 'Advanced',
    estimatedTime: '30 mins',
    route: '/dashboard/student/3d-shapes',
    isActive: true,
    isFeatured: false,
    accessRoles: ['student', 'teacher'],
    tags: ['mathematics', '3D', 'geometry', 'shapes'],
    order: 9,
  },
  {
    featureId: 'ecz-practice',
    name: 'ECZ Exam Practice',
    description:
      'AI-generated past-paper style questions for Grade 9 and Grade 12 ECZ examinations.',
    category: 'stem',
    icon: 'GraduationCap',
    difficulty: 'Intermediate',
    estimatedTime: '30-60 mins',
    route: '/dashboard/student/ecz-practice',
    isActive: true,
    isFeatured: true,
    accessRoles: ['student', 'teacher', 'hod'],
    tags: ['ECZ', 'exam', 'Grade 9', 'Grade 12', 'practice'],
    order: 10,
  },
]

async function seedCreativeFeatures(schoolId = null) {
  console.log('🌱 Seeding creative features...')

  let schools = []
  if (schoolId) {
    schools = [{ id: schoolId }]
  } else {
    schools = await prisma.school.findMany({
      where: { active: true },
      select: { id: true, name: true },
    })
    console.log(`Found ${schools.length} active schools`)
  }

  for (const school of schools) {
    console.log(`  Seeding for school: ${school.name || school.id}`)

    for (const feature of CREATIVE_FEATURES) {
      await prisma.creativeFeature.upsert({
        where: {
          schoolId_featureId: {
            schoolId: school.id,
            featureId: feature.featureId,
          },
        },
        update: {
          name: feature.name,
          description: feature.description,
          category: feature.category,
          icon: feature.icon,
          difficulty: feature.difficulty,
          estimatedTime: feature.estimatedTime,
          route: feature.route,
          isActive: feature.isActive,
          isFeatured: feature.isFeatured,
          accessRoles: feature.accessRoles,
          tags: feature.tags,
          order: feature.order,
        },
        create: {
          schoolId: school.id,
          featureId: feature.featureId,
          name: feature.name,
          description: feature.description,
          category: feature.category,
          icon: feature.icon,
          difficulty: feature.difficulty,
          estimatedTime: feature.estimatedTime,
          route: feature.route,
          isActive: feature.isActive,
          isFeatured: feature.isFeatured,
          accessRoles: feature.accessRoles,
          tags: feature.tags,
          order: feature.order,
        },
      })
      process.stdout.write('.')
    }
    console.log(` ✓ ${CREATIVE_FEATURES.length} features seeded`)
  }

  console.log('✅ Creative features seeding complete!')
}

seedCreativeFeatures()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
