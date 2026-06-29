import prisma from '@/lib/prisma'

/**
 * Revoke all refresh tokens for a user (logout, password reset, security events).
 * @param {string} userId
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [db]
 */
export async function revokeAllUserRefreshTokens(userId, db = prisma) {
  const id = String(userId || '').trim()
  if (!id) return { count: 0 }
  const result = await db.refreshToken.updateMany({
    where: { userId: id, revoked: false },
    data: { revoked: true },
  })
  return { count: result.count }
}
