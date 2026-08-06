import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { PrismaClient } from '@prisma/client'

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  const schoolId = '818097ac-d9d6-44cc-9526-7056237814fb'

  const settings = await prisma.schoolSmsSettings.findUnique({
    where: { schoolId },
    select: { customGatewayEnabled: true, smsBalance: true, parentSmsPresent: true },
  })
  const gateway = await prisma.sMSGateway.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, deviceName: true, lastSeenAt: true, isActive: true },
  })
  const pendingGateway = await prisma.smsLog.count({
    where: { schoolId, status: 'PENDING', provider: 'custom_gateway' },
  })
  const recent = await prisma.smsLog.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      provider: true,
      status: true,
      failureReason: true,
      recipient: true,
      createdAt: true,
      body: true,
    },
  })

  console.log(
    JSON.stringify(
      {
        settings,
        gateway,
        pendingGateway,
        recent: recent.map((r) => ({
          ...r,
          body: String(r.body || '').slice(0, 50),
        })),
      },
      null,
      2
    )
  )

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
