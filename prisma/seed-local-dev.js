/**
 * Seeds the canonical local-dev school and users. Run before local testing:
 *   npm run seed:local
 */
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { hash } = require('bcryptjs')
const {
  LOCAL_DEV_SCHOOL,
  LOCAL_DEV_ACCOUNTS,
  getLocalDevPassword,
  printLocalDevCredentials,
} = require('../lib/dev/localTestAccounts')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required. Set it in .env before running seed:local.')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function upsertUser(schoolId, account, passwordHash) {
  const email = account.email.toLowerCase()
  const user = await prisma.user.upsert({
    where: { schoolId_email: { schoolId, email } },
    create: {
      schoolId,
      email,
      password: passwordHash,
      name: account.name,
      role: account.role,
    },
    update: {
      password: passwordHash,
      name: account.name,
      role: account.role,
    },
  })
  return user
}

async function main() {
  const password = getLocalDevPassword()
  const passwordHash = await hash(password, 12)
  const { subdomain, name, email: schoolEmail } = LOCAL_DEV_SCHOOL

  console.log('🌱 Seeding local dev school and test users...')

  const school = await prisma.school.upsert({
    where: { subdomain },
    create: {
      name,
      subdomain,
      domain: `${subdomain}.localhost`,
      email: schoolEmail,
      active: true,
      emailVerified: true,
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      level: 'combined',
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
      academicYear: '2025/2026',
    },
    update: {
      name,
      active: true,
      emailVerified: true,
      plan: 'trial',
    },
  })

  const byKey = Object.fromEntries(LOCAL_DEV_ACCOUNTS.map((a) => [a.key, a]))

  const headteacher = await upsertUser(school.id, byKey.headteacher, passwordHash)
  const hodUser = await upsertUser(school.id, byKey.hod, passwordHash)
  const teacherUser = await upsertUser(school.id, byKey.teacher, passwordHash)
  const studentUser = await upsertUser(school.id, byKey.student, passwordHash)

  await prisma.headOfDepartment.upsert({
    where: { userId: hodUser.id },
    create: {
      userId: hodUser.id,
      schoolId: school.id,
      department: byKey.hod.department || 'Mathematics',
    },
    update: { department: byKey.hod.department || 'Mathematics' },
  })

  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    create: {
      userId: teacherUser.id,
      schoolId: school.id,
      department: 'Science',
      specialization: 'Biology',
    },
    update: { department: 'Science' },
  })

  let classRef = await prisma.class.findFirst({
    where: { schoolId: school.id, name: byKey.student.studentClass },
    select: { id: true },
  })
  if (!classRef) {
    classRef = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: byKey.student.studentClass,
        year_group: 'Form 1',
        section: 'A',
      },
      select: { id: true },
    })
  }

  const existingStudent = await prisma.student.findFirst({
    where: { schoolId: school.id, userId: studentUser.id },
    select: { id: true },
  })
  if (existingStudent) {
    await prisma.student.update({
      where: { id: existingStudent.id },
      data: {
        name: byKey.student.name,
        class: byKey.student.studentClass,
        classId: classRef.id,
      },
    })
  } else {
    await prisma.student.create({
      data: {
        userId: studentUser.id,
        schoolId: school.id,
        name: byKey.student.name,
        class: byKey.student.studentClass,
        classId: classRef.id,
        exam_number: 'LOCAL-DEV-001',
      },
    })
  }

  console.log(`✅ School: ${school.name} (${school.subdomain})`)
  console.log(`✅ Users: ${LOCAL_DEV_ACCOUNTS.length} (password reset to LOCAL_DEV_PASSWORD)`)
  printLocalDevCredentials()
}

main()
  .catch((e) => {
    console.error('❌ seed:local failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
