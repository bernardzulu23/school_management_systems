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
    description:
      'Digital canvas for real-time drawing, annotation and collaboration between teacher and students.',
    category: 'creative',
    iconName: 'PenTool',
    difficulty: 'Beginner',
    estimatedTime: 'Instant',
    roles: ['teacher', 'student', 'hod', 'headteacher', 'administrator'],
  },
  {
    featureId: 'ai_story_generator',
    name: 'AI Story Weaver',
    description:
      'Generate engaging Zambian-context educational stories, fables, and poems using AI for any subject and grade.',
    category: 'creative',
    iconName: 'BookOpen',
    difficulty: 'Intermediate',
    estimatedTime: '15-30 mins',
    roles: ['teacher', 'hod', 'headteacher', 'administrator'],
  },
  {
    featureId: 'music_composer',
    name: 'Digital Music Composer',
    description:
      'Create and play music sequences using an interactive note sequencer with piano roll visualisation.',
    category: 'creative',
    iconName: 'Music',
    difficulty: 'Beginner',
    estimatedTime: '20 mins',
    roles: ['student', 'teacher'],
  },
  {
    featureId: 'ai_lesson_planner',
    name: 'AI Lesson Planner',
    description:
      'Generate complete lesson plans for any subject and grade using AI, aligned to the Zambian curriculum.',
    category: 'creative',
    iconName: 'ClipboardList',
    difficulty: 'Beginner',
    estimatedTime: '5 mins',
    roles: ['teacher', 'hod', 'headteacher', 'administrator'],
  },
  {
    featureId: 'ai_quiz_maker',
    name: 'AI Quiz Maker',
    description:
      'Instantly generate MCQ, true/false, and short answer questions for any topic and difficulty level.',
    category: 'creative',
    iconName: 'HelpCircle',
    difficulty: 'Beginner',
    estimatedTime: '10 mins',
    roles: ['teacher', 'hod', 'headteacher', 'administrator'],
  },
  {
    featureId: 'ai_report_comments',
    name: 'AI Report Card Comments',
    description:
      'Auto-generate professional student report card comments based on performance data.',
    category: 'creative',
    iconName: 'FileText',
    difficulty: 'Beginner',
    estimatedTime: '5 mins',
    roles: ['teacher', 'hod', 'headteacher', 'administrator'],
  },

  {
    featureId: 'virtual_lab',
    name: 'Virtual Science Lab',
    description:
      'Interactive PhET simulations for Physics, Chemistry, and Biology — no equipment or chemicals needed.',
    category: 'stem',
    iconName: 'FlaskConical',
    difficulty: 'Advanced',
    estimatedTime: '45 mins',
    roles: ['student', 'teacher', 'hod', 'headteacher', 'administrator'],
  },
  {
    featureId: 'code_playground',
    name: 'Code Playground',
    description:
      'Write and run Python, JavaScript, Java, C, and Bash code in the browser with instant output.',
    category: 'stem',
    iconName: 'Code2',
    difficulty: 'Intermediate',
    estimatedTime: 'Flexible',
    roles: ['student', 'teacher', 'hod', 'headteacher', 'administrator'],
  },
  {
    featureId: '3d_modeler',
    name: '3D Shape Builder',
    description:
      'Build and rotate 3D geometric shapes to understand volume, surface area, and spatial relationships.',
    category: 'stem',
    iconName: 'Box',
    difficulty: 'Advanced',
    estimatedTime: '30 mins',
    roles: ['student', 'teacher', 'hod', 'headteacher', 'administrator'],
  },
  {
    featureId: 'ecz_practice',
    name: 'ECZ Exam Practice',
    description:
      'AI-generated past-paper style questions for Grade 9 and Grade 12 ECZ examinations.',
    category: 'stem',
    iconName: 'GraduationCap',
    difficulty: 'Intermediate',
    estimatedTime: '30-60 mins',
    roles: ['student', 'teacher', 'hod', 'headteacher', 'administrator'],
  },
]

function loadEnvIfNeeded() {
  if (process.env.DATABASE_URL) return
  const fs = require('fs')
  const path = require('path')
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let val = trimmed.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

async function seedCreativeFeatures(schoolId = null) {
  loadEnvIfNeeded()
  console.log('Seeding creative features...')

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

  console.log('Creative features seeding complete!')
}

const arg = process.argv[2] || null
if (arg === '--help' || arg === '-h') {
  console.log('Usage: node seed-creative-features.js [schoolId]')
  process.exit(0)
}

const schoolIdArg = arg && String(arg).startsWith('-') ? null : arg

seedCreativeFeatures(schoolIdArg)
  .catch((e) => {
    console.error(e)
    if (String(e?.message || '').includes("Can't reach database server")) {
      console.error(
        'Tip: run this with Railway env/network via: railway run node seed-creative-features.js'
      )
    }
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
