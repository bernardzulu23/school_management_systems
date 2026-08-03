/**
 * One-shot: grant 50 trial SMS credits to existing trial schools that still have
 * balance 0 and have never received the trial pack (`trialSmsGrantedAt` null).
 *
 * Usage (from school_management_systems):
 *   node scripts/backfill-trial-sms-credits.js
 *   node scripts/backfill-trial-sms-credits.js --dry-run
 *
 * Requires DATABASE_URL or DIRECT_URL (loads .env.local / .env when present).
 */
try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config({ path: '.env' })
} catch {
  /* dotenv optional */
}

const { PrismaClient } = require('@prisma/client')

const TRIAL_SMS_CREDITS = 50

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) {
    console.error('No DATABASE_URL / DIRECT_URL — aborting')
    process.exit(1)
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } })
  const now = new Date()

  try {
    const trialSchools = await prisma.school.findMany({
      where: {
        OR: [{ plan: 'trial' }, { trialEndsAt: { gt: now } }],
      },
      select: { id: true, name: true, subdomain: true, plan: true, trialEndsAt: true },
    })

    const settings = await prisma.schoolSmsSettings.findMany({
      where: { schoolId: { in: trialSchools.map((s) => s.id) } },
      select: {
        schoolId: true,
        smsBalance: true,
        trialSmsGrantedAt: true,
        smsLifetimeGranted: true,
      },
    })
    const bySchool = new Map(settings.map((s) => [s.schoolId, s]))

    const eligible = trialSchools.filter((s) => {
      const row = bySchool.get(s.id)
      if (!row) return true
      if (row.trialSmsGrantedAt) return false
      return (row.smsBalance ?? 0) === 0
    })

    console.log(
      JSON.stringify(
        {
          dryRun,
          trialSchools: trialSchools.length,
          eligible: eligible.length,
          schools: eligible.map((s) => ({
            id: s.id,
            name: s.name,
            subdomain: s.subdomain,
            plan: s.plan,
          })),
        },
        null,
        2
      )
    )

    if (dryRun || eligible.length === 0) {
      return
    }

    let granted = 0
    for (const school of eligible) {
      await prisma.schoolSmsSettings.upsert({
        where: { schoolId: school.id },
        create: {
          schoolId: school.id,
          smsBalance: TRIAL_SMS_CREDITS,
          smsLifetimeGranted: TRIAL_SMS_CREDITS,
          smsLifetimeUsed: 0,
          trialSmsGrantedAt: now,
        },
        update: {
          smsBalance: { increment: TRIAL_SMS_CREDITS },
          smsLifetimeGranted: { increment: TRIAL_SMS_CREDITS },
          trialSmsGrantedAt: now,
        },
      })
      granted += 1
      console.log(`Granted ${TRIAL_SMS_CREDITS} to ${school.subdomain} (${school.id})`)
    }

    console.log(JSON.stringify({ granted }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
