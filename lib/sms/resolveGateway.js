/**
 * Resolve the Android SIM gateway for a school (or the platform shared gateway).
 * Prefers active shared gateway; falls back to legacy per-school row during transition.
 */
import { basePrisma } from '@/lib/prisma/client'

/**
 * @returns {Promise<import('@prisma/client').SMSGateway | null>}
 */
export async function resolveActiveGatewayForSchool(schoolId) {
  const shared = await basePrisma.sMSGateway.findFirst({
    where: { isShared: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (shared) return shared

  const sid = String(schoolId || '').trim()
  if (!sid) return null

  return basePrisma.sMSGateway.findFirst({
    where: { schoolId: sid, isActive: true },
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
