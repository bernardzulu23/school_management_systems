const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database')
}

const poolConnectionString = (() => {
  try {
    const url = new URL(connectionString)
    const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase()
    const compat = (url.searchParams.get('uselibpqcompat') || '').toLowerCase()
    if (!compat && (sslmode === 'require' || sslmode === 'prefer' || sslmode === 'verify-ca')) {
      url.searchParams.set('uselibpqcompat', 'true')
      return url.toString()
    }
    return connectionString
  } catch {
    return connectionString
  }
})()

const ssl = (() => {
  try {
    const url = new URL(poolConnectionString)
    const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase()
    if (sslmode && sslmode !== 'disable') return { rejectUnauthorized: false }
    return undefined
  } catch {
    return undefined
  }
})()

const pool = new Pool({ connectionString: poolConnectionString, ...(ssl ? { ssl } : {}) })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Start seeding ...')

  // 1. Create School
  console.log('Seeding school...')
  const school = await prisma.school.upsert({
    where: { subdomain: 'demo' },
    update: {
      active: true,
      emailVerified: true,
    },
    create: {
      name: 'Demo International School',
      subdomain: 'demo',
      domain: 'demo.school.com', // Optional
      email: 'admin@demo.school.com',
      active: true,
      emailVerified: true,
      currency: 'USD',
      timezone: 'UTC',
      academicYear: '2025/2026',
      plan: 'premium',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      level: 'combined',
    },
  })
  console.log(`Created school: ${school.name} (${school.id})`)

  const hashedPassword = await bcrypt.hash('password123', 10)

  const users = [
    { email: 'headteacher@school.com', name: 'Headteacher Demo', role: 'headteacher' },
    { email: 'hod@school.com', name: 'HOD Demo', role: 'hod' },
    { email: 'teacher@school.com', name: 'Teacher Demo', role: 'teacher' },
    { email: 'student@school.com', name: 'Student Demo', role: 'student' },
  ]

  for (const u of users) {
    // Check for existing user by schoolId + email
    const existingUser = await prisma.user.findUnique({
      where: {
        schoolId_email: {
          schoolId: school.id,
          email: u.email,
        },
      },
    })

    let user = existingUser

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          password: hashedPassword,
          schoolId: school.id,
        },
      })
      console.log(`Created user: ${user.email}`)
    }

    // Create profile based on role
    if (u.role === 'teacher') {
      const profile = await prisma.teacher.findUnique({ where: { userId: user.id } })
      if (!profile) {
        await prisma.teacher.create({
          data: {
            userId: user.id,
            schoolId: school.id,
          },
        })
      }
    } else if (u.role === 'student') {
      const profile = await prisma.student.findUnique({ where: { userId: user.id } })
      if (!profile) {
        await prisma.student.create({
          data: {
            id: 'STU2025000', // Matches demo student ID
            userId: user.id,
            schoolId: school.id,
            name: u.name,
            class: 'Form 1A',
            exam_number: 'EXAM2025000',
          },
        })
      }
    }
  }

  // Seed Subjects
  console.log('Seeding subjects...')
  const subjects = [
    {
      name: 'Mathematics',
      code: 'MATH',
      topics: ['Algebra', 'Geometry', 'Calculus', 'Statistics'],
    },
    {
      name: 'English Language',
      code: 'ENG',
      topics: ['Grammar', 'Composition', 'Comprehension', 'Literature'],
    },
    { name: 'Science', code: 'SCI', topics: ['Biology', 'Physics', 'Chemistry', 'Environment'] },
    {
      name: 'Social Studies',
      code: 'SST',
      topics: ['History', 'Civics', 'Geography', 'Economics'],
    },
    {
      name: 'ICT',
      code: 'ICT',
      topics: ['Computer Basics', 'Programming', 'Networking', 'Digital Literacy'],
    },
    { name: 'History', code: 'HIST' },
    { name: 'Geography', code: 'GEO' },
    { name: 'Religious Education', code: 'RE' },
    { name: 'Physical Education', code: 'PE' },
    {
      name: 'Physics',
      code: 'PHY',
      topics: ['Mechanics', 'Thermodynamics', 'Optics', 'Electricity'],
    },
    {
      name: 'Chemistry',
      code: 'CHEM',
      topics: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry'],
    },
    {
      name: 'Biology',
      code: 'BIO',
      topics: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology'],
    },
    { name: 'Accounting', code: 'ACC' },
    { name: 'Business Studies', code: 'BUS' },
    { name: 'Economics', code: 'ECO' },
    {
      name: 'English Literature',
      code: 'LIT',
      topics: ['Shakespeare', 'Modern Drama', 'Poetry', 'Novels'],
    },
    { name: 'Shona', code: 'SHO' },
    { name: 'Ndebele', code: 'NDE' },
    { name: 'French', code: 'FRE' },
    { name: 'Art and Design', code: 'ART' },
    { name: 'Music', code: 'MUS' },
    { name: 'Drama/Theatre Arts', code: 'DRA' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Design and Technology', code: 'DT' },
    { name: 'Computer Studies', code: 'CS' },
    { name: 'Commerce', code: 'COM' },
    { name: 'Food and Nutrition', code: 'FN' },
    { name: 'Fashion and Fabrics', code: 'FF' },
    { name: 'Woodwork', code: 'WW' },
    { name: 'Metalwork', code: 'MW' },
    { name: 'Civic Education', code: 'CIV' },
    { name: 'Zambian Languages', code: 'ZAM' },
    { name: 'Creative & Technology Studies', code: 'CTS' },
    { name: 'Home Economics', code: 'HE' },
    { name: 'Additional Mathematics', code: 'ADDM' },
    { name: 'Statistics', code: 'STAT' },
    { name: 'Psychology', code: 'PSY' },
    { name: 'Sociology', code: 'SOC' },
    { name: 'General Science', code: 'GENS' },
  ]

  // Seed Games
  console.log('Seeding games...')
  const games = [
    {
      title: 'Math Quest: Algebra',
      description: 'Solve algebraic equations to unlock the treasure.',
      type: 'puzzle',
      subject: 'Mathematics',
      difficulty: 'medium',
      content: { levels: 10, timeLimit: 300 },
    },
    {
      title: 'Science Explorer: Cells',
      description: 'Explore the inner workings of a cell.',
      type: 'challenge',
      subject: 'Science',
      difficulty: 'easy',
      content: { mode: 'exploration' },
    },
    {
      title: 'History Time Travel',
      description: 'Travel back in time to ancient civilizations.',
      type: 'quiz',
      subject: 'History',
      difficulty: 'hard',
      content: { questions: 20 },
    },
  ]

  for (const game of games) {
    await prisma.game.create({
      data: {
        ...game,
        schoolId: school.id,
      },
    })
  }

  // Seed Field Trips
  console.log('Seeding field trips...')
  const fieldTrips = [
    {
      title: 'Virtual Museum Tour',
      description: 'Explore the Louvre Museum from your classroom.',
      location: 'Paris, France (Virtual)',
      date: new Date('2025-05-15'),
      type: 'virtual',
      subject: 'Art and Design',
      grade: 'All',
      imageUrl:
        'https://images.unsplash.com/photo-1499856871940-a09e32842449?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      status: 'upcoming',
    },
    {
      title: 'Mars Rover Expedition',
      description: 'A virtual journey across the surface of Mars.',
      location: 'Mars (Virtual)',
      date: new Date('2025-06-10'),
      type: 'virtual',
      subject: 'Science',
      grade: 'Form 1',
      imageUrl:
        'https://images.unsplash.com/photo-1614728853980-40bc488f1d48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      status: 'upcoming',
    },
    {
      title: 'Ancient Egypt Walkthrough',
      description: 'Walk through the pyramids of Giza.',
      location: 'Cairo, Egypt (Virtual)',
      date: new Date('2025-07-20'),
      type: 'virtual',
      subject: 'History',
      grade: 'Form 2',
      imageUrl:
        'https://images.unsplash.com/photo-1539650116455-251d9a0d63f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      status: 'upcoming',
    },
  ]

  for (const trip of fieldTrips) {
    await prisma.fieldTrip.create({
      data: {
        ...trip,
        schoolId: school.id,
      },
    })
  }

  // Seed Assessments
  console.log('Seeding assessments...')
  const assessments = [
    {
      title: 'Mid-Term Math Exam',
      subject: 'Mathematics',
      class: 'Form 1A',
      date: new Date('2025-06-01'),
      duration_minutes: 90,
      type: 'exam',
      description: 'Covers Algebra and Geometry.',
    },
    {
      title: 'Science Quiz: Biology',
      subject: 'Science',
      class: 'Form 1A',
      date: new Date('2025-05-20'),
      duration_minutes: 30,
      type: 'quiz',
      description: 'Focus on Cell Biology.',
    },
    {
      title: 'English Essay',
      subject: 'English Language',
      class: 'Form 1A',
      date: new Date('2025-05-25'),
      duration_minutes: 60,
      type: 'assignment',
      description: 'Write an essay about your favorite book.',
    },
  ]

  for (const assessment of assessments) {
    await prisma.assessment.create({
      data: {
        ...assessment,
        schoolId: school.id,
      },
    })
  }

  // Gamification profile seeding is handled later in the file
  for (const subject of subjects) {
    const existingSubject = await prisma.subject.findFirst({
      where: {
        schoolId: school.id,
        name: subject.name,
      },
    })

    if (!existingSubject) {
      await prisma.subject.create({
        data: {
          ...subject,
          schoolId: school.id,
        },
      })
    } else {
      // Update topics if subject exists
      await prisma.subject.update({
        where: { id: existingSubject.id },
        data: {
          topics: subject.topics || [],
        },
      })
    }
  }
  console.log(`Seeded ${subjects.length} subjects`)

  // Seed mock students for 'Form 1A'
  console.log('Seeding mock students for Form 1A...')
  for (let i = 1; i <= 15; i++) {
    const studentId = `STU${2025000 + i}`
    const exists = await prisma.student.findUnique({ where: { id: studentId } })
    if (!exists) {
      await prisma.student.create({
        data: {
          id: studentId,
          schoolId: school.id,
          name: `Student ${i} (Form 1A)`,
          class: 'Form 1A',
          exam_number: `EXAM${2025000 + i}`,
        },
      })
    }
  }

  // Get demo student
  const studentEmail = 'student@school.com'
  const studentUser = await prisma.user.findUnique({
    where: {
      schoolId_email: {
        schoolId: school.id,
        email: studentEmail,
      },
    },
  })

  if (studentUser) {
    const studentProfile = await prisma.student.findUnique({ where: { userId: studentUser.id } })
    if (studentProfile) {
      console.log('Seeding data for demo student...')

      // Seed Goals
      const goalsData = [
        {
          title: 'Achieve A Grade in Mathematics',
          category: 'academic',
          description: 'Improve mathematics performance to achieve an A grade by end of term',
          status: 'in_progress',
          progress: 75,
        },
        {
          title: 'Read 20 Books This Year',
          category: 'personal',
          description: 'Expand knowledge and improve reading comprehension',
          status: 'in_progress',
          progress: 40,
        },
      ]

      for (const goal of goalsData) {
        const existingGoal = await prisma.goal.findFirst({
          where: {
            schoolId: school.id,
            studentId: studentProfile.id,
            title: goal.title,
          },
        })

        if (!existingGoal) {
          await prisma.goal.create({
            data: {
              ...goal,
              schoolId: school.id,
              studentId: studentProfile.id,
            },
          })
        }
      }

      // Seed Attendance
      console.log('Seeding attendance...')
      const attendanceStatuses = [
        'present',
        'present',
        'present',
        'present',
        'late',
        'present',
        'absent',
      ]
      const today = new Date()

      for (let i = 0; i < 30; i++) {
        const date = new Date()
        date.setDate(today.getDate() - i)
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue

        const status = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)]
        const canonicalDate = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
        )

        await prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: studentProfile.id,
              date: canonicalDate,
            },
          },
          update: {
            status: status,
            remarks: status === 'absent' ? 'Sick leave' : status === 'late' ? 'Bus delay' : null,
            schoolId: school.id,
          },
          create: {
            schoolId: school.id,
            studentId: studentProfile.id,
            date: canonicalDate,
            status: status,
            remarks: status === 'absent' ? 'Sick leave' : status === 'late' ? 'Bus delay' : null,
          },
        })
      }

      // Seed Assignments
      console.log('Seeding assignments...')
      const assignmentsData = [
        {
          title: 'Algebra Problem Set 1',
          subject: 'Mathematics',
          class: 'Form 1A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
          description: 'Complete problems 1-20 from Chapter 3',
        },
        {
          title: 'Essay: The Great Gatsby',
          subject: 'English Literature',
          class: 'Form 1A',
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue
          description: 'Write a 500-word essay on the themes of the novel',
        },
        {
          title: 'Physics Lab Report',
          subject: 'Physics',
          class: 'Form 1A',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          description: 'Submit report for the pendulum experiment',
        },
      ]

      for (const assign of assignmentsData) {
        let assignment = await prisma.assignment.findFirst({
          where: {
            schoolId: school.id,
            title: assign.title,
          },
        })

        if (!assignment) {
          assignment = await prisma.assignment.create({
            data: {
              ...assign,
              schoolId: school.id,
            },
          })
        }

        // Create submission for some
        if (assign.subject === 'Physics') {
          const submission = await prisma.assignmentSubmission.findFirst({
            where: { assignmentId: assignment.id, studentId: studentProfile.id },
          })

          if (!submission) {
            await prisma.assignmentSubmission.create({
              data: {
                assignmentId: assignment.id,
                studentId: studentProfile.id,
                schoolId: school.id,
                status: 'submitted',
                content: 'Here is my lab report...',
                submittedAt: new Date(),
              },
            })
          }
        }
      }

      // Seed Student Works
      console.log('Seeding student works...')
      const worksData = [
        {
          title: 'Solar System Model',
          description: '3D model of the solar system using recycled materials',
          type: 'science',
          likes: 24,
          views: 156,
          isPublic: true,
        },
        {
          title: 'Abstract Painting',
          description: 'Exploration of colors and emotions',
          type: 'art',
          likes: 45,
          views: 230,
          isPublic: true,
        },
        {
          title: 'Python Calculator',
          description: 'Simple calculator app built with Python',
          type: 'coding',
          likes: 12,
          views: 89,
          isPublic: true,
        },
      ]

      for (const work of worksData) {
        const existingWork = await prisma.studentWork.findFirst({
          where: {
            schoolId: school.id,
            studentId: studentProfile.id,
            title: work.title,
          },
        })

        if (!existingWork) {
          await prisma.studentWork.create({
            data: {
              ...work,
              schoolId: school.id,
              studentId: studentProfile.id,
            },
          })
        }
      }

      // Seed Gamification Profile
      console.log('Seeding gamification profile...')
      const gamification = await prisma.gamificationProfile.upsert({
        where: { studentId: studentProfile.id },
        update: {},
        create: {
          studentId: studentProfile.id,
          schoolId: school.id,
          points: 1250,
          level: 8,
          xp: 1250,
          nextLevelXp: 1600,
        },
      })

      // Ensure badges exist
      const badgesData = [
        {
          name: 'First Steps',
          description: 'Complete your first game',
          icon: 'TARGET',
          category: 'academic',
          rarity: 'common',
          xpValue: 10,
        },
        {
          name: 'Perfect Score',
          description: 'Get 100% on any game',
          icon: 'STAR',
          category: 'academic',
          rarity: 'rare',
          xpValue: 50,
        },
        {
          name: 'Speed Demon',
          description: 'Complete a game in under 5 minutes',
          icon: 'SPEED',
          category: 'academic',
          rarity: 'epic',
          xpValue: 30,
        },
      ]

      for (const badge of badgesData) {
        const exists = await prisma.badge.findFirst({
          where: {
            schoolId: school.id,
            name: badge.name,
          },
        })
        if (!exists) {
          await prisma.badge.create({
            data: {
              ...badge,
              schoolId: school.id,
            },
          })
        }
      }

      // Assign badges
      const allBadges = await prisma.badge.findMany({ where: { schoolId: school.id } })
      for (const badge of allBadges) {
        const assigned = await prisma.studentBadge.findUnique({
          where: {
            profileId_badgeId: {
              profileId: gamification.id,
              badgeId: badge.id,
            },
          },
        })

        if (!assigned) {
          await prisma.studentBadge.create({
            data: {
              profileId: gamification.id,
              badgeId: badge.id,
              schoolId: school.id,
              awardedAt: new Date(),
            },
          })
        }
      }

      // Seed Games and Game Plays
      const gamesData = [
        {
          title: 'Math Quiz',
          description: 'Algebra basics',
          type: 'quiz',
          difficulty: 'medium',
          content: {},
          subject: 'Mathematics',
        },
        {
          title: 'Vocab Blast',
          description: 'English vocabulary',
          type: 'quiz',
          difficulty: 'easy',
          content: {},
          subject: 'English Language',
        },
      ]

      for (const game of gamesData) {
        let gameRec = await prisma.game.findFirst({
          where: {
            schoolId: school.id,
            title: game.title,
          },
        })
        if (!gameRec) {
          gameRec = await prisma.game.create({
            data: {
              ...game,
              schoolId: school.id,
            },
          })
        }

        // Create play record
        await prisma.studentGame.create({
          data: {
            studentId: studentProfile.id,
            gameId: gameRec.id,
            schoolId: school.id,
            score: Math.floor(Math.random() * 100),
            completed: true,
            playedAt: new Date(),
          },
        })
      }
    }
  }

  // Seed Field Trips
  console.log('Seeding field trips...')
  const fieldTripsData = [
    {
      title: 'Virtual Museum Tour',
      description: 'Explore the National Museum of History',
      location: 'New York, USA',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      type: 'virtual',
      subject: 'History',
      grade: 'Form 1',
      imageUrl:
        'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&q=80&w=1000',
      status: 'upcoming',
      stops: [
        {
          id: 1,
          title: 'Main Hall',
          description: 'The grand entrance',
          image:
            'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&q=80&w=1000',
          audioUrl: '',
        },
        {
          id: 2,
          title: 'Ancient Egypt',
          description: 'Mummies and artifacts',
          image:
            'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&q=80&w=1000',
          audioUrl: '',
        },
      ],
    },
    {
      title: 'Space Station Visit',
      description: 'Tour the International Space Station',
      location: 'Low Earth Orbit',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      type: 'virtual',
      subject: 'Science',
      grade: 'Form 1',
      imageUrl:
        'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000',
      status: 'upcoming',
      stops: [
        {
          id: 1,
          title: 'Control Room',
          description: 'Where operations happen',
          image:
            'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000',
          audioUrl: '',
        },
        {
          id: 2,
          title: 'Observation Deck',
          description: 'View of Earth',
          image:
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000',
          audioUrl: '',
        },
      ],
    },
  ]

  for (const trip of fieldTripsData) {
    const existingTrip = await prisma.fieldTrip.findFirst({
      where: {
        schoolId: school.id,
        title: trip.title,
      },
    })

    if (!existingTrip) {
      await prisma.fieldTrip.create({
        data: {
          ...trip,
          schoolId: school.id,
        },
      })
    }
  }

  // Seed Creative Features
  console.log('Seeding creative features...')
  const creativeFeaturesData = [
    {
      featureId: 'interactive_whiteboard',
      name: 'Interactive Whiteboard',
      description: 'Digital canvas for real-time collaboration',
      category: 'creative',
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: 'Instant',
      iconName: 'PenTool',
    },
    {
      featureId: 'ai_story_generator',
      name: 'AI Story Weaver',
      description: 'Collaborative storytelling with AI assistance',
      category: 'creative',
      roles: ['student'],
      difficulty: 'Intermediate',
      estimatedTime: '15-30 mins',
      iconName: 'BookOpen',
    },
    {
      featureId: 'virtual_lab',
      name: 'Virtual Science Lab',
      description: 'Simulated experiments in a safe environment',
      category: 'stem',
      roles: ['student', 'teacher'],
      difficulty: 'Advanced',
      estimatedTime: '45 mins',
      iconName: 'FlaskConical',
    },
    {
      featureId: 'code_playground',
      name: 'Code Playground',
      description: 'Interactive coding environment with instant feedback',
      category: 'stem',
      roles: ['student'],
      difficulty: 'Intermediate',
      estimatedTime: 'Flexible',
      iconName: 'Code',
    },
    {
      featureId: 'music_composer',
      name: 'Digital Music Composer',
      description: 'Create and mix music tracks',
      category: 'creative',
      roles: ['student'],
      difficulty: 'Beginner',
      estimatedTime: '20 mins',
      iconName: 'Music',
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
  ]

  for (const feature of creativeFeaturesData) {
    const existingFeature = await prisma.creativeFeature.findUnique({
      where: {
        schoolId_featureId: {
          schoolId: school.id,
          featureId: feature.featureId,
        },
      },
    })

    if (!existingFeature) {
      await prisma.creativeFeature.create({
        data: {
          ...feature,
          schoolId: school.id,
        },
      })
    }
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
