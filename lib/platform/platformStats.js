/**
 * Platform-wide aggregates — metadata only, no per-school academic data.
 */
import prisma from '@/lib/prisma'
import { isAffiliatedSchool, subscriptionStatusLabel } from '@/lib/platform/schoolEligibility'
import { getDaysUntilExpiry } from '@/lib/billing/subscription'

/**
 * @param {Array<import('@prisma/client').School>} schools
 */
export function aggregateOverviewFromSchools(schools, now = new Date()) {
  const buckets = {
    total: schools.length,
    active: 0,
    trial: 0,
    expired: 0,
    suspended: 0,
    notAffiliated: 0,
    expiringWithin14Days: 0,
  }

  const onboardingByMonth = new Map()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  let churnSuspended = 0

  for (const s of schools) {
    if (!s.active) {
      buckets.suspended++
      if (s.updatedAt && new Date(s.updatedAt) >= thirtyDaysAgo) churnSuspended++
      continue
    }
    if (!isAffiliatedSchool(s)) {
      buckets.notAffiliated++
      continue
    }
    const status = subscriptionStatusLabel(s)
    if (status === 'active') buckets.active++
    else if (status === 'trial') buckets.trial++
    else if (status === 'expired') buckets.expired++

    const days = getDaysUntilExpiry(s, now)
    if (days != null && days <= 14) buckets.expiringWithin14Days++

    const created = s.createdAt ? new Date(s.createdAt) : null
    if (created) {
      const key = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, '0')}`
      onboardingByMonth.set(key, (onboardingByMonth.get(key) || 0) + 1)
    }
  }

  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    months.push({
      month: key,
      label: d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      count: onboardingByMonth.get(key) || 0,
    })
  }

  return {
    ...buckets,
    churnSuspendedLast30Days: churnSuspended,
    onboardingByMonth: months,
  }
}

/**
 * @param {Array<{ province: string | null, active: boolean, emailVerified: boolean, plan: string, trialEndsAt: Date | null, planExpiresAt: Date | null }>} schools
 */
export function aggregateProvincesFromSchools(schools) {
  const byProvince = new Map()

  for (const s of schools) {
    const province = String(s.province || 'Unspecified').trim() || 'Unspecified'
    const row = byProvince.get(province) || {
      province,
      total: 0,
      active: 0,
      trial: 0,
      expired: 0,
      suspended: 0,
    }
    row.total++
    if (!s.active) {
      row.suspended++
      byProvince.set(province, row)
      continue
    }
    if (!isAffiliatedSchool(s)) {
      byProvince.set(province, row)
      continue
    }
    const status = subscriptionStatusLabel(s)
    if (status === 'active') row.active++
    else if (status === 'trial') row.trial++
    else if (status === 'expired') row.expired++
    byProvince.set(province, row)
  }

  return [...byProvince.values()].sort((a, b) => b.total - a.total)
}

/**
 * @param {Array<{ province: string | null, district: string | null, reportingStreamKey: string | null, active: boolean, emailVerified: boolean, plan: string, trialEndsAt: Date | null, planExpiresAt: Date | null }>} schools
 */
export function aggregateDistrictsFromSchools(schools, filterProvince = '') {
  const fp = String(filterProvince || '').trim()
  const byDistrict = new Map()

  for (const s of schools) {
    const province = String(s.province || 'Unspecified').trim() || 'Unspecified'
    if (fp && province.toLowerCase() !== fp.toLowerCase()) continue

    const district = String(s.district || 'Unspecified').trim() || 'Unspecified'
    const key = `${province}::${district}`
    const row = byDistrict.get(key) || {
      province,
      district,
      reportingStreamKey: s.reportingStreamKey || null,
      total: 0,
      active: 0,
      trial: 0,
      expired: 0,
      suspended: 0,
    }
    row.total++
    if (!s.active) {
      row.suspended++
      byDistrict.set(key, row)
      continue
    }
    if (!isAffiliatedSchool(s)) {
      byDistrict.set(key, row)
      continue
    }
    const status = subscriptionStatusLabel(s)
    if (status === 'active') row.active++
    else if (status === 'trial') row.trial++
    else if (status === 'expired') row.expired++
    byDistrict.set(key, row)
  }

  return [...byDistrict.values()].sort((a, b) => b.total - a.total)
}

/**
 * Reporting streams = one segment per province+district (monitoring & future admin assignment).
 */
export function aggregateReportingStreamsFromSchools(schools) {
  const byStream = new Map()

  for (const s of schools) {
    const province = String(s.province || 'Unspecified').trim() || 'Unspecified'
    const district = String(s.district || 'Unspecified').trim() || 'Unspecified'
    const streamKey =
      s.reportingStreamKey ||
      (province !== 'Unspecified' && district !== 'Unspecified'
        ? `${province.toLowerCase().replace(/[^a-z0-9]+/g, '-')}__${district.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : 'unassigned')

    const row = byStream.get(streamKey) || {
      reportingStreamKey: streamKey,
      province,
      district,
      label: district === 'Unspecified' ? province : `${province} — ${district}`,
      schoolCount: 0,
      active: 0,
      trial: 0,
      expired: 0,
      suspended: 0,
    }
    row.schoolCount++
    if (!s.active) {
      row.suspended++
      byStream.set(streamKey, row)
      continue
    }
    if (!isAffiliatedSchool(s)) {
      byStream.set(streamKey, row)
      continue
    }
    const status = subscriptionStatusLabel(s)
    if (status === 'active') row.active++
    else if (status === 'trial') row.trial++
    else if (status === 'expired') row.expired++
    byStream.set(streamKey, row)
  }

  return [...byStream.values()].sort((a, b) => b.schoolCount - a.schoolCount)
}

export async function fetchAllSchoolsForPlatformStats() {
  return prisma.school.findMany({
    select: {
      id: true,
      active: true,
      emailVerified: true,
      plan: true,
      trialEndsAt: true,
      planExpiresAt: true,
      province: true,
      district: true,
      reportingStreamKey: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getPlatformOverviewStats() {
  const schools = await fetchAllSchoolsForPlatformStats()
  return aggregateOverviewFromSchools(schools)
}

export async function getPlatformProvinceStats() {
  const schools = await fetchAllSchoolsForPlatformStats()
  return aggregateProvincesFromSchools(schools)
}

export async function getPlatformDistrictStats(province = '') {
  const schools = await fetchAllSchoolsForPlatformStats()
  return aggregateDistrictsFromSchools(schools, province)
}

export async function getPlatformReportingStreamStats() {
  const schools = await fetchAllSchoolsForPlatformStats()
  return aggregateReportingStreamsFromSchools(schools)
}
