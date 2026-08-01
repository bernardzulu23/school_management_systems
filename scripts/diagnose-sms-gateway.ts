import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const schoolId = '818097ac-d9d6-44cc-9526-7056237814fb'

async function main() {
  const settings = await prisma.schoolSmsSettings.findUnique({ where: { schoolId } })
  const gateways = await prisma.sMSGateway.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      isActive: true,
      lastSeenAt: true,
      updatedAt: true,
      phoneNumber: true,
    },
  })
  const pending = await prisma.smsLog.count({
    where: { schoolId, status: 'PENDING', channel: 'CUSTOM_GATEWAY' },
  })
  console.log(JSON.stringify({ settings, gateways, pendingGatewaySms: pending }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
