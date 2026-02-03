const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding ...')

  const hashedPassword = await bcrypt.hash('password123', 10)

  const users = [
    { email: 'headteacher@school.com', name: 'Headteacher Demo', role: 'headteacher' },
    { email: 'hod@school.com', name: 'HOD Demo', role: 'hod' },
    { email: 'teacher@school.com', name: 'Teacher Demo', role: 'teacher' },
    { email: 'student@school.com', name: 'Student Demo', role: 'student' },
  ]

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hashedPassword,
      },
    })
    console.log(`Created user with id: ${user.id}`)

    // Create profile based on role
    if (u.role === 'teacher') {
      await prisma.teacher.create({
        data: {
          userId: user.id,
          subjects: ['Mathematics', 'English'],
        }
      }).catch(() => {}) // Ignore if exists (upsert logic for relations is complex in loop)
    } else if (u.role === 'student') {
      await prisma.student.create({
        data: {
          id: 'STU2025000', // Matches demo student ID
          userId: user.id,
          name: u.name,
          class: 'Form 1A',
        }
      }).catch(() => {})
    }
  }

  // Seed mock students for 'Form 1A'
  console.log('Seeding mock students for Form 1A...')
  for (let i = 1; i <= 15; i++) {
    const studentId = `STU${2025000 + i}`
    // check if exists
    const exists = await prisma.student.findUnique({ where: { id: studentId } })
    if (!exists) {
      await prisma.student.create({
        data: {
          id: studentId,
          name: `Student ${i} (Form 1A)`,
          class: 'Form 1A',
        }
      })
    }
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
