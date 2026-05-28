/**
 * Seed / update platform super admin (developer console).
 * Run: npm run seed:platform-admin
 *
 * Override via env: PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD, PLATFORM_ADMIN_NAME
 */
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { hash } = require('bcryptjs')

const ADMIN = {
  email: (process.env.PLATFORM_ADMIN_EMAIL || 'super-admin@bluepeacktechnologies.com')
    .trim()
    .toLowerCase(),
  password: process.env.PLATFORM_ADMIN_PASSWORD || 'P@fjK43WjhL',
  name: process.env.PLATFORM_ADMIN_NAME || 'Platform Super Admin',
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
  console.log('🌱 Seeding platform super admin...')

  const hashedPassword = await hash(ADMIN.password, 12)

  const admin = await prisma.platformAdmin.upsert({
    where: { email: ADMIN.email },
    update: {
      password: hashedPassword,
      name: ADMIN.name,
      active: true,
    },
    create: {
      email: ADMIN.email,
      password: hashedPassword,
      name: ADMIN.name,
      active: true,
    },
  })

  const loginPath = '/login'
  const base =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXTAUTH_URL ||
    'https://bluepeacktechnologies.com'

  console.log('\n✨ Platform super admin ready\n')
  console.log(`   Email:    ${admin.email}`)
  console.log(`   Name:     ${admin.name}`)
  console.log(`   Login:    ${String(base).replace(/\/$/, '')}${loginPath}`)
  console.log(`   Local:    http://localhost:3000${loginPath}\n`)
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
