/**
 * Seed / update platform super admin (developer console).
 * Run: npm run seed:platform-admin
 *
 * Requires: PLATFORM_ADMIN_PASSWORD (no hardcoded default).
 * Optional: PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_NAME
 */
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { hash } = require('bcryptjs')

const email = (process.env.PLATFORM_ADMIN_EMAIL || 'super-admin@bluepeacktechnologies.com')
  .trim()
  .toLowerCase()
const password = String(process.env.PLATFORM_ADMIN_PASSWORD || '').trim()
const name = process.env.PLATFORM_ADMIN_NAME || 'Platform Super Admin'

if (!password || password.length < 12) {
  console.error(
    '❌ PLATFORM_ADMIN_PASSWORD is required (min 12 chars). Set it in the environment — never commit it.'
  )
  process.exit(1)
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

  const hashedPassword = await hash(password, 12)

  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
      active: true,
    },
    create: {
      email,
      password: hashedPassword,
      name,
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
  console.log('   Password: (from PLATFORM_ADMIN_PASSWORD — not printed)\n')
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
