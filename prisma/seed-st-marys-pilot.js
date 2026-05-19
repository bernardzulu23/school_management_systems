/**
 * Seed pilot school: St. Mary's R. Christian Day and Boarding Secondary School
 * Run: npm run seed:st-marys
 */
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { hash } = require('bcryptjs')

const PILOT = {
  name: "St. Mary's R. Christian Day and Boarding Secondary School",
  subdomain: 'stmaryschristian',
  domain: 'stmaryschristian.bluepeacktechnologies.com',
  logo_url: '/Assets/stmarys-logo.jpg',
  adminEmail: 'nchimunya001@gmail.com',
  adminName: "St. Mary's Administrator",
  adminPassword: process.env.STMARYS_PILOT_PASSWORD || 'L9@ihj!2nhFHg78',
  schoolEmail: 'nchimunya001@gmail.com',
  level: 'secondary',
  plan: 'premium',
  academicYear: '2026',
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding St. Mary's pilot school...")

  const trialEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  const planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  const school = await prisma.school.upsert({
    where: { subdomain: PILOT.subdomain },
    update: {
      name: PILOT.name,
      domain: PILOT.domain,
      logo_url: PILOT.logo_url,
      email: PILOT.schoolEmail,
      active: true,
      emailVerified: true,
      isPubliclyListed: true,
      level: PILOT.level,
      plan: PILOT.plan,
      trialEndsAt,
      planExpiresAt,
      academicYear: PILOT.academicYear,
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
    },
    create: {
      name: PILOT.name,
      subdomain: PILOT.subdomain,
      domain: PILOT.domain,
      logo_url: PILOT.logo_url,
      email: PILOT.schoolEmail,
      active: true,
      emailVerified: true,
      isPubliclyListed: true,
      level: PILOT.level,
      plan: PILOT.plan,
      trialEndsAt,
      planExpiresAt,
      academicYear: PILOT.academicYear,
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
    },
  })

  const hashedPassword = await hash(PILOT.adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: {
      schoolId_email: {
        schoolId: school.id,
        email: PILOT.adminEmail,
      },
    },
    update: {
      password: hashedPassword,
      name: PILOT.adminName,
      role: 'headteacher',
    },
    create: {
      schoolId: school.id,
      email: PILOT.adminEmail,
      password: hashedPassword,
      name: PILOT.adminName,
      role: 'headteacher',
    },
  })

  const baseUrl = `https://${school.subdomain}.bluepeacktechnologies.com`
  const loginUrl = `${baseUrl}/login`

  console.log("\n✨ St. Mary's pilot school ready\n")
  console.log(`   School:     ${school.name}`)
  console.log(`   Subdomain:  ${school.subdomain}`)
  console.log(`   Logo:       ${school.logo_url}`)
  console.log(`   Login URL:  ${loginUrl}`)
  console.log(`   Admin:      ${admin.email}`)
  console.log(`   Password:   (set via STMARYS_PILOT_PASSWORD or seed default)`)
  console.log(`\n   Local dev:  http://localhost:3000/login`)
  console.log(`               (use subdomain "${school.subdomain}" if prompted)\n`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
