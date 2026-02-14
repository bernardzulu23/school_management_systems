
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding games and assessments...')

  // 1. Seed Games
  const gamesData = [
    {
      title: 'Math Quiz',
      description: 'Test your addition skills!',
      type: 'quiz',
      subject: 'Mathematics',
      difficulty: 'easy',
      content: {
        id: 'math-quiz',
        timeLimit: 5,
        questions: [
          {
            question: 'What is 15 + 27?',
            options: ['32', '42', '45', '38'],
            correctAnswer: '42',
            points: 10
          },
          {
            question: 'What is 12 x 8?',
            options: ['86', '96', '108', '92'],
            correctAnswer: '96',
            points: 10
          },
          {
            question: 'Solve for x: 2x + 5 = 15',
            options: ['3', '5', '7', '10'],
            correctAnswer: '5',
            points: 15
          }
        ]
      }
    },
    {
      title: 'Science Challenge',
      description: 'Basic physics concepts',
      type: 'quiz',
      subject: 'Science',
      difficulty: 'medium',
      content: {
        id: 'science-quiz',
        timeLimit: 8,
        questions: [
          {
            question: 'What is the unit of force?',
            options: ['Watt', 'Joule', 'Newton', 'Pascal'],
            correctAnswer: 'Newton',
            points: 10
          },
          {
            question: 'Which planet is known as the Red Planet?',
            options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
            correctAnswer: 'Mars',
            points: 10
          }
        ]
      }
    }
  ]

  for (const game of gamesData) {
    // Check if game exists by title (simple check)
    const existing = await prisma.game.findFirst({
      where: { title: game.title }
    })

    if (!existing) {
      await prisma.game.create({
        data: game
      })
      console.log(`Created game: ${game.title}`)
    } else {
      console.log(`Game already exists: ${game.title}`)
    }
  }

  // 2. Seed Assessments
  // First, get a class to assign assessments to
  const form1A = await prisma.class.findFirst({
    where: { name: 'Form 1A' }
  }) || await prisma.class.findFirst()

  if (form1A) {
    const assessmentsData = [
      {
        title: 'Mid-Term Math Exam',
        subject: 'Mathematics',
        class: form1A.name,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        duration_minutes: 90,
        type: 'exam',
        description: 'Covers Algebra and Geometry'
      },
      {
        title: 'Physics Lab Report',
        subject: 'Physics',
        class: form1A.name,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration_minutes: 0, // Assignment
        type: 'assignment',
        description: 'Submit report on pendulum experiment'
      },
      {
        title: 'History Essay',
        subject: 'History',
        class: form1A.name,
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        duration_minutes: 0,
        type: 'assignment',
        description: 'World War II impact analysis'
      }
    ]

    for (const assessment of assessmentsData) {
      const existing = await prisma.assessment.findFirst({
        where: { 
          title: assessment.title,
          class: assessment.class
        }
      })

      if (!existing) {
        await prisma.assessment.create({
          data: assessment
        })
        console.log(`Created assessment: ${assessment.title}`)
      } else {
        console.log(`Assessment already exists: ${assessment.title}`)
      }
    }
  } else {
    console.log('No class found to seed assessments')
  }

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
