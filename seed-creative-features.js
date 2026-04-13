/**
 * Run this once to seed creative features into the database:
 * node seed-creative-features.js
 * OR add to your existing seed.js file
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CREATIVE_FEATURES = [
  {
    featureId: 'interactive_whiteboard',
    name: 'Interactive Whiteboard',
    description: 'Digital canvas for real-time drawing and collaboration',
    category: 'creative',
    roles: ['teacher', 'student', 'hod', 'headteacher'],
    difficulty: 'Beginner',
    estimatedTime: 'Instant',
    iconName: 'PenTool',
  },
  {
    featureId: 'ai_story_generator',
    name: 'AI Story Weaver',
    description: 'Generate stories and reading comprehension prompts with AI assistance',
    category: 'creative',
    roles: ['teacher', 'hod', 'headteacher'],
    difficulty: 'Intermediate',
    estimatedTime: '15-30 mins',
    iconName: 'BookOpen',
  },
  {
    featureId: 'music_composer',
    name: 'Digital Music Composer',
    description: 'Create and play music sequences using an interactive sequencer',
    category: 'creative',
    roles: ['student'],
    difficulty: 'Beginner',
    estimatedTime: '20 mins',
    iconName: 'Music',
  },
  {
    featureId: 'virtual_lab',
    name: 'Virtual Science Lab',
    description: 'Interactive PhET science simulations',
    category: 'stem',
    roles: ['student', 'teacher', 'hod'],
    difficulty: 'Advanced',
    estimatedTime: '45 mins',
    iconName: 'FlaskConical',
  },
  {
    featureId: 'code_playground',
    name: 'Code Playground',
    description: 'Write and run code in the browser with instant output',
    category: 'stem',
    roles: ['student', 'teacher'],
    difficulty: 'Intermediate',
    estimatedTime: 'Flexible',
    iconName: 'Code',
  },
  {
    featureId: '3d_modeler',
    name: '3D Shape Builder',
    description: 'Build and visualize 3D geometric shapes',
    category: 'stem',
    roles: ['student'],
    difficulty: 'Advanced',
    estimatedTime: '30 mins',
    iconName: 'Box',
  },
  {
    featureId: 'ai_lesson_planner',
    name: 'AI Lesson Planner',
    description: 'Generate lesson plans aligned to the Zambian curriculum',
    category: 'creative',
    roles: ['teacher', 'hod', 'headteacher'],
    difficulty: 'Beginner',
    estimatedTime: '5 mins',
    iconName: 'ClipboardList',
  },
  {
    featureId: 'ai_quiz_maker',
    name: 'AI Quiz Maker',
    description: 'Generate quizzes and practice questions instantly',
    category: 'creative',
    roles: ['teacher', 'hod', 'headteacher'],
    difficulty: 'Beginner',
    estimatedTime: '10 mins',
    iconName: 'HelpCircle',
  },
  {
    featureId: 'ai_report_comments',
    name: 'AI Report Comments',
    description: 'Generate report comments based on performance and behaviour',
    category: 'creative',
    roles: ['teacher', 'hod', 'headteacher'],
    difficulty: 'Beginner',
    estimatedTime: '5 mins',
    iconName: 'FileText',
  },
  {
    featureId: 'ecz_practice',
    name: 'ECZ Exam Practice',
    description: 'Practice ECZ-style questions for Grade 9 and Grade 12',
    category: 'stem',
    roles: ['student', 'teacher', 'hod', 'headteacher'],
    difficulty: 'Intermediate',
    estimatedTime: '30-60 mins',
    iconName: 'GraduationCap',
  },
]

async function seedCreativeFeatures(schoolId = null) {
  console.log('🌱 Seeding creative features...')

  let schools = []
  if (schoolId) {
    schools = [{ id: schoolId }]
  } else {
    schools = await prisma.school.findMany({
      where: { isActive: true },
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
          iconName: feature.iconName,
          difficulty: feature.difficulty,
          estimatedTime: feature.estimatedTime,
          roles: feature.roles,
        },
        create: {
          schoolId: school.id,
          featureId: feature.featureId,
          name: feature.name,
          description: feature.description,
          category: feature.category,
          iconName: feature.iconName,
          difficulty: feature.difficulty,
          estimatedTime: feature.estimatedTime,
          roles: feature.roles,
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
