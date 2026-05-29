/**
 * Seeds starter gamification content (badges + games) and ensures every student
 * has a gamification profile, so the student dashboard gamification widgets and
 * the Games tab have real data to display.
 *
 * Run for all schools:
 *   npm run seed:gamification
 * Run for a single school:
 *   SCHOOL_ID=<id> npm run seed:gamification
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

// Standalone node scripts do not auto-load .env files like Next.js does, so the
// app's database (configured in .env.local) is loaded explicitly here. Values
// from .env.local take precedence so the seed always targets the same database
// as the running app.
function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, '..', fileName)
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) process.env[key] = value
  }
}

// .env first (base), then .env.local overrides — matching Next.js precedence.
loadEnvFile('.env')
loadEnvFile('.env.local')

// Seeds should run over a direct (unpooled) connection — Prisma's recommended
// practice — so DIRECT_URL is preferred, falling back to DATABASE_URL.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error(
    'DIRECT_URL or DATABASE_URL is required. Set it in .env.local before running seed:gamification.'
  )
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const STARTER_BADGES = [
  {
    name: 'First Steps',
    description: 'Completed your first game',
    icon: '🎯',
    category: 'academic',
    rarity: 'common',
    xpValue: 10,
  },
  {
    name: 'Quick Learner',
    description: 'Scored 80% or higher in a game',
    icon: '⚡',
    category: 'academic',
    rarity: 'rare',
    xpValue: 25,
  },
  {
    name: 'Perfect Score',
    description: 'Scored 100% in a game',
    icon: '🏆',
    category: 'academic',
    rarity: 'epic',
    xpValue: 50,
  },
  {
    name: 'Streak Master',
    description: 'Played games on consecutive days',
    icon: '🔥',
    category: 'social',
    rarity: 'rare',
    xpValue: 30,
  },
  {
    name: 'Knowledge Champion',
    description: 'Reached level 5',
    icon: '👑',
    category: 'academic',
    rarity: 'legendary',
    xpValue: 100,
  },
]

const STARTER_GAMES = [
  {
    title: 'Quick Maths Challenge',
    description: 'Test your mental arithmetic with timed questions.',
    type: 'quiz',
    subject: 'Mathematics',
    difficulty: 'easy',
    content: {
      pointsReward: 20,
      timeLimit: 5,
      questions: [
        {
          id: 'q1',
          question: 'What is 12 × 8?',
          options: ['86', '96', '108', '88'],
          correctAnswer: '96',
          points: 1,
        },
        {
          id: 'q2',
          question: 'What is 144 ÷ 12?',
          options: ['10', '11', '12', '14'],
          correctAnswer: '12',
          points: 1,
        },
        {
          id: 'q3',
          question: 'What is 25% of 200?',
          options: ['25', '40', '50', '75'],
          correctAnswer: '50',
          points: 1,
        },
        {
          id: 'q4',
          question: 'What is 7²?',
          options: ['42', '47', '49', '56'],
          correctAnswer: '49',
          points: 1,
        },
        {
          id: 'q5',
          question: 'What is 15 + 27?',
          options: ['41', '42', '43', '44'],
          correctAnswer: '42',
          points: 1,
        },
      ],
    },
  },
  {
    title: 'Science Explorer',
    description: 'Discover key facts in biology, chemistry and physics.',
    type: 'quiz',
    subject: 'Integrated Science',
    difficulty: 'medium',
    content: {
      pointsReward: 25,
      timeLimit: 6,
      questions: [
        {
          id: 'q1',
          question: 'What gas do plants absorb for photosynthesis?',
          options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
          correctAnswer: 'Carbon dioxide',
          points: 1,
        },
        {
          id: 'q2',
          question: 'What is the chemical symbol for water?',
          options: ['HO', 'H2O', 'O2', 'CO2'],
          correctAnswer: 'H2O',
          points: 1,
        },
        {
          id: 'q3',
          question: 'What force pulls objects towards the earth?',
          options: ['Friction', 'Gravity', 'Magnetism', 'Tension'],
          correctAnswer: 'Gravity',
          points: 1,
        },
        {
          id: 'q4',
          question: 'How many bones are in the adult human body?',
          options: ['106', '206', '306', '406'],
          correctAnswer: '206',
          points: 1,
        },
        {
          id: 'q5',
          question: 'What part of the cell controls its activities?',
          options: ['Membrane', 'Cytoplasm', 'Nucleus', 'Wall'],
          correctAnswer: 'Nucleus',
          points: 1,
        },
      ],
    },
  },
  {
    title: 'English Word Power',
    description: 'Sharpen your vocabulary and grammar.',
    type: 'quiz',
    subject: 'English',
    difficulty: 'easy',
    content: {
      pointsReward: 20,
      timeLimit: 5,
      questions: [
        {
          id: 'q1',
          question: 'Which word is a synonym of "happy"?',
          options: ['Sad', 'Joyful', 'Angry', 'Tired'],
          correctAnswer: 'Joyful',
          points: 1,
        },
        {
          id: 'q2',
          question: 'What is the plural of "child"?',
          options: ['Childs', 'Childes', 'Children', 'Childer'],
          correctAnswer: 'Children',
          points: 1,
        },
        {
          id: 'q3',
          question: 'Choose the correct spelling.',
          options: ['Recieve', 'Receive', 'Receeve', 'Receve'],
          correctAnswer: 'Receive',
          points: 1,
        },
        {
          id: 'q4',
          question: 'Which is a verb?',
          options: ['Quickly', 'Run', 'Beautiful', 'Happiness'],
          correctAnswer: 'Run',
          points: 1,
        },
        {
          id: 'q5',
          question: 'What punctuation ends a question?',
          options: ['.', '!', '?', ','],
          correctAnswer: '?',
          points: 1,
        },
      ],
    },
  },
]

async function seedSchool(schoolId) {
  for (const badge of STARTER_BADGES) {
    await prisma.badge.upsert({
      where: { schoolId_name: { schoolId, name: badge.name } },
      create: { ...badge, schoolId },
      update: {
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        xpValue: badge.xpValue,
      },
    })
  }

  for (const game of STARTER_GAMES) {
    const existing = await prisma.game.findFirst({ where: { schoolId, title: game.title } })
    if (existing) {
      await prisma.game.update({ where: { id: existing.id }, data: { ...game } })
    } else {
      await prisma.game.create({ data: { ...game, schoolId } })
    }
  }

  const students = await prisma.student.findMany({ where: { schoolId }, select: { id: true } })
  let profilesCreated = 0
  for (const s of students) {
    const profile = await prisma.gamificationProfile.findUnique({ where: { studentId: s.id } })
    if (!profile) {
      await prisma.gamificationProfile.create({
        data: { studentId: s.id, schoolId, points: 0, level: 1, xp: 0, nextLevelXp: 100 },
      })
      profilesCreated += 1
    }
  }

  console.log(
    `  School ${schoolId}: ${STARTER_BADGES.length} badges, ${STARTER_GAMES.length} games, ${profilesCreated} new student profiles`
  )
}

async function main() {
  const targetSchoolId = process.env.SCHOOL_ID
  const schools = targetSchoolId
    ? [{ id: targetSchoolId }]
    : await prisma.school.findMany({ select: { id: true } })

  if (schools.length === 0) {
    console.log('No schools found to seed.')
    return
  }

  console.log(`Seeding gamification for ${schools.length} school(s)...`)
  for (const school of schools) {
    await seedSchool(school.id)
  }
  console.log('Gamification seed complete.')
}

main()
  .catch((e) => {
    console.error('Gamification seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
