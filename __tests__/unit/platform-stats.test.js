import { describe, it, expect } from 'vitest'
import {
  aggregateOverviewFromSchools,
  aggregateProvincesFromSchools,
  aggregateReportingStreamsFromSchools,
} from '@/lib/platform/platformStats'

const now = new Date('2026-05-01T12:00:00Z')

function school(overrides = {}) {
  return {
    id: 's1',
    active: true,
    emailVerified: true,
    plan: 'basic',
    trialEndsAt: null,
    planExpiresAt: new Date('2027-01-01'),
    province: 'Lusaka',
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date('2026-03-15'),
    ...overrides,
  }
}

describe('aggregateOverviewFromSchools', () => {
  it('counts active, trial, expired, suspended', () => {
    const schools = [
      school(),
      school({ id: 's2', plan: 'trial', trialEndsAt: new Date('2027-06-01'), planExpiresAt: null }),
      school({
        id: 's3',
        plan: 'basic',
        planExpiresAt: new Date('2020-01-01'),
      }),
      school({ id: 's4', active: false }),
    ]
    const result = aggregateOverviewFromSchools(schools, now)
    expect(result.total).toBe(4)
    expect(result.active).toBe(1)
    expect(result.trial).toBe(1)
    expect(result.expired).toBe(1)
    expect(result.suspended).toBe(1)
    expect(result.onboardingByMonth).toHaveLength(12)
  })
})

describe('aggregateProvincesFromSchools', () => {
  it('groups by province', () => {
    const rows = aggregateProvincesFromSchools([
      school({ province: 'Lusaka' }),
      school({ id: 's2', province: 'Lusaka' }),
      school({ id: 's3', province: null }),
    ])
    const lusaka = rows.find((r) => r.province === 'Lusaka')
    expect(lusaka?.total).toBe(2)
    expect(rows.some((r) => r.province === 'Unspecified')).toBe(true)
  })
})

describe('aggregateReportingStreamsFromSchools', () => {
  it('groups schools by reporting stream key', () => {
    const schools = [
      school({ province: 'Lusaka', district: 'Kafue', reportingStreamKey: 'lusaka__kafue' }),
      school({
        id: 's2',
        province: 'Lusaka',
        district: 'Kafue',
        reportingStreamKey: 'lusaka__kafue',
      }),
      school({
        id: 's3',
        province: 'Eastern',
        district: 'Chipata',
        reportingStreamKey: 'eastern__chipata',
      }),
    ]
    const streams = aggregateReportingStreamsFromSchools(schools)
    const kafue = streams.find((s) => s.reportingStreamKey === 'lusaka__kafue')
    expect(kafue?.schoolCount).toBe(2)
    expect(streams).toHaveLength(2)
  })
})
