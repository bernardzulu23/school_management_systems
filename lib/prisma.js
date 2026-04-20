import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  })

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
