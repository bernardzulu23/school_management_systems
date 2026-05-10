import prisma from '@/lib/prisma'

export async function logAuditAction({
  userId,
  schoolId,
  action,
  entity,
  entityId,
  oldValue = null,
  newValue = null,
  request = null,
}) {
  try {
    const { ip, userAgent } = request || {
      ip: 'system',
      userAgent: 'system',
    }

    await prisma.auditLog.create({
      data: {
        userId,
        schoolId,
        action,
        entity,
        entityId,
        oldValue,
        newValue,
        ipAddress: ip,
        userAgent: userAgent,
      },
    })
  } catch (error) {
    console.error('[AuditLog Error]:', error)
    // We do not throw here to avoid breaking the main operation
    // just because logging failed.
  }
}
