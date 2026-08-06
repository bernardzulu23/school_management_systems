/**
 * Resolve the Android SIM gateway for a school.
 * Prefer dedicated (school-bound) active gateway; else platform shared gateway.
 */
import { basePrisma } from '@/lib/prisma/client'

/**
 * @returns {Promise<import('@prisma/client').SMSGateway | null>}
 */
export async function resolveActiveGatewayForSchool(schoolId) {
  const sid = String(schoolId || '').trim()
  if (sid) {
    const dedicated = await basePrisma.sMSGateway.findFirst({
      where: { schoolId: sid, isActive: true, isShared: false },
      orderBy: { updatedAt: 'desc' },
    })
    if (dedicated) return dedicated
  }

  return basePrisma.sMSGateway.findFirst({
    where: { isShared: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
}

/**
 * Platform shared gateway only (no per-school fallback).
 * @returns {Promise<import('@prisma/client').SMSGateway | null>}
 */
export async function resolveSharedGateway() {
  return basePrisma.sMSGateway.findFirst({
    where: { isShared: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
}
