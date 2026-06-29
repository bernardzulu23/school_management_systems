import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { canUserManageCareerGuidance } from '@/lib/guidance/guidanceAccess'

/**
 * @param {object} user
 * @param {string} schoolId
 */
export async function assertCareerGuidanceManager(user, schoolId) {
  const allowed = await canUserManageCareerGuidance(prisma, user, schoolId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/**
 * Staff who may list inactive career resources (?all=1) — guidance teachers only.
 * @param {object} user
 * @param {string} schoolId
 */
export async function isCareerGuidanceStaff(user, schoolId) {
  return canUserManageCareerGuidance(prisma, user, schoolId)
}
