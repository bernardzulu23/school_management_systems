import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

let prisma

if (isBuildTime) {
  prisma = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'then') return undefined
        return new Proxy(() => Promise.resolve([]), {
          get(_, p) {
            if (p === 'then') return undefined
            return () => Promise.resolve([])
          },
        })
      },
    }
  )
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
export default prisma
