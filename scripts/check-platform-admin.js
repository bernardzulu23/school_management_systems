require('dotenv').config()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const email = 'super-admin@bluepeacktechnologies.com'
  const admin = await prisma.platformAdmin.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })
  if (!admin) {
    console.log('NO PlatformAdmin row for', email)
    process.exit(1)
  }
  const testPassword = process.env.PLATFORM_ADMIN_PASSWORD || ''
  const ok = await bcrypt.compare(testPassword, admin.password)
  console.log('Email:', admin.email)
  console.log('Active:', admin.active)
  console.log('Hash starts with $2:', String(admin.password).startsWith('$2'))
  console.log('Password matches (seed/default):', ok)
}

main().finally(async () => {
  await prisma.$disconnect()
  await pool.end()
})
