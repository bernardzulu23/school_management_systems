/**
 * Ndake schools: premium feature tier during trial (platform + in-app).
 * Run: npm run seed:ndake-premium-trial
 */
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

const NDAKE_SUBDOMAINS = ['ndakeprimaryschool', 'ndakedaysecondaryschool']

const TRIAL_DAYS = Number(process.env.NDAKE_TRIAL_DAYS || 365)

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  console.log('🌱 Updating Ndake schools → premium + trial…\n')

  for (const subdomain of NDAKE_SUBDOMAINS) {
    const school = await prisma.school.findFirst({
      where: { subdomain: { equals: subdomain, mode: 'insensitive' } },
    })

    if (!school) {
      console.log(`   ⚠ Skipped (not found): ${subdomain}`)
      continue
    }

    const updated = await prisma.school.update({
      where: { id: school.id },
      data: {
        plan: 'premium',
        trialEndsAt,
        planExpiresAt: null,
        active: true,
        emailVerified: true,
      },
    })

    console.log(`   ✓ ${updated.name}`)
    console.log(`     subdomain: ${updated.subdomain}`)
    console.log(`     plan: premium · trial until ${trialEndsAt.toISOString().slice(0, 10)}\n`)
  }

  console.log('Done. Refresh the platform dashboard to see Premium + trial.\n')
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
